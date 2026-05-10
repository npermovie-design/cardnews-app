import { useState, useEffect, useRef, useCallback } from "react";
import DOMPurify from "dompurify";
import { supabase } from "./storage";

/* ═══════════════════════════════════════════════════════════
   ClassPage — 클래스101/클래스유 스타일 온라인 강의 플랫폼
   - VOD / 줌 라이브 / 오프라인
   - 관리자 + 등록 강사만 업로드
   - 과제 제출(스크린샷/파일) → 다음 강의 잠금
   - CC 자막 자동 번역 + 음성 변환
   - 무료 미리보기 / 유료 / 회원 제한
   - 캘린더 실시간 라이브 일정
═══════════════════════════════════════════════════════════ */

const GRAD = "#3b82f6";
const ACC = "#3b82f6";

// ── 유틸 ──
const dateStr = (d) => { const dt = new Date(d); return `${dt.getFullYear()}.${String(dt.getMonth()+1).padStart(2,"0")}.${String(dt.getDate()).padStart(2,"0")}`; };
const isSameDay = (a, b) => a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();

// ── Supabase DB ↔ 프론트 변환 ──
const dbToFront = (row, lessons = [], schedules = []) => ({
  id: row.id, title: row.title, desc: row.desc, type: row.type,
  pricing: row.pricing, price: row.price,
  freePreviewCount: row.free_preview_count, memberVisibleCount: row.member_visible_count,
  tags: row.tags || [], thumbnail: row.thumbnail,
  introHtml: row.intro_html, targetAudience: row.target_audience,
  process: row.process, notes: row.notes, instructorBio: row.instructor_bio,
  instructor: row.instructor, instructorUid: row.instructor_uid,
  difficulty: row.difficulty || "입문", durationInfo: row.duration_info || "무제한",
  createdAt: row.created_at,
  lessons: lessons.map(l => ({
    id: l.id, title: l.title, duration: l.duration, videoSrc: l.video_src,
    isFreePreview: l.is_free_preview, assignmentRequired: l.assignment_required,
    assignmentDesc: l.assignment_desc, order: l.order,
  })),
  liveSchedules: schedules.map(s => ({
    id: s.id, date: s.date, title: s.title, duration: s.duration,
    maxSeats: s.max_seats, enrolled: s.enrolled,
  })),
});

const frontToDb = (c) => ({
  id: c.id, title: c.title, desc: c.desc, type: c.type,
  pricing: c.pricing, price: c.price || 0,
  free_preview_count: c.freePreviewCount || 2,
  member_visible_count: c.memberVisibleCount || 5,
  tags: c.tags || [], thumbnail: c.thumbnail || '',
  intro_html: c.introHtml || '', target_audience: c.targetAudience || '',
  process: c.process || '', notes: c.notes || '',
  instructor_bio: c.instructorBio || '',
  instructor: c.instructor || '', instructor_uid: c.instructorUid || '',
  difficulty: c.difficulty || '입문', duration_info: c.durationInfo || '무제한',
  updated_at: new Date().toISOString(),
});

const lessonToDb = (l, classId) => ({
  id: l.id, class_id: classId, title: l.title, duration: l.duration || '',
  video_src: l.videoSrc || '', is_free_preview: !!l.isFreePreview,
  assignment_required: !!l.assignmentRequired, assignment_desc: l.assignmentDesc || '',
  order: l.order || 0,
});

const scheduleToDb = (s, classId) => ({
  id: s.id, class_id: classId, date: s.date, title: s.title || '',
  duration: s.duration || '60분', max_seats: s.maxSeats || 30, enrolled: s.enrolled || 0,
});

// ── Supabase CRUD ──
async function loadAllCourses() {
  const { data: rows } = await supabase.from("classes").select("*").order("created_at", { ascending: false });
  if (!rows?.length) return [];
  const ids = rows.map(r => r.id);
  const [{ data: lessons }, { data: schedules }] = await Promise.all([
    supabase.from("class_lessons").select("*").in("class_id", ids).order("order"),
    supabase.from("class_live_schedules").select("*").in("class_id", ids),
  ]);
  return rows.map(r => dbToFront(
    r,
    (lessons || []).filter(l => l.class_id === r.id),
    (schedules || []).filter(s => s.class_id === r.id),
  ));
}

async function saveCourseToDb(course) {
  const row = frontToDb(course);
  await supabase.from("classes").upsert(row, { onConflict: "id" });
  // 레슨: 기존 삭제 후 재삽입
  await supabase.from("class_lessons").delete().eq("class_id", course.id);
  if (course.lessons?.length) {
    await supabase.from("class_lessons").insert(course.lessons.map(l => lessonToDb(l, course.id)));
  }
  // 라이브 일정
  await supabase.from("class_live_schedules").delete().eq("class_id", course.id);
  if (course.liveSchedules?.length) {
    await supabase.from("class_live_schedules").insert(course.liveSchedules.map(s => scheduleToDb(s, course.id)));
  }
}

async function deleteCourseFromDb(courseId) {
  await supabase.from("classes").delete().eq("id", courseId);
}

// ── 캘린더 (Event Manager 스타일) ──
function ClassCalendar({ schedules, C, isDark, onSelectDate }) {
  const [month, setMonth] = useState(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1); });
  const [view, setView] = useState("month"); // month | week | list
  const [hoveredEvent, setHoveredEvent] = useState(null);
  const year = month.getFullYear(), mon = month.getMonth();
  const today = new Date();

  const allSchedules = schedules || [];
  const getSchedules = (d) => d ? allSchedules.filter(s => { const sd = new Date(s.date); return sd.getFullYear()===year && sd.getMonth()===mon && sd.getDate()===d; }) : [];

  const panelBg = isDark ? "rgba(255,255,255,0.045)" : "#fff";
  const panelBorder = isDark ? "rgba(255,255,255,0.06)" : "#eef0f6";
  const hoverBg = isDark ? "rgba(255,255,255,0.02)" : "#fafbfe";

  // 뷰 버튼 스타일
  const viewBtn = (v) => ({
    padding: "5px 12px", borderRadius: 8, border: "none", cursor: "pointer",
    fontSize: 12, fontWeight: view === v ? 700 : 500, fontFamily: "inherit",
    background: view === v ? (isDark ? "rgba(59,130,246,0.12)" : "rgba(59,130,246,0.08)") : "transparent",
    color: view === v ? ACC : (isDark ? "rgba(255,255,255,0.5)" : "#64748b"),
    transition: "all 0.15s",
  });

  // ── 월간 뷰 ──
  const renderMonth = () => {
    const firstDay = new Date(year, mon, 1).getDay();
    const daysInMonth = new Date(year, mon + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);

    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", borderTop: `1px solid ${panelBorder}` }}>
        {["일","월","화","수","목","금","토"].map((d,i) => (
          <div key={d} style={{ fontSize: 11, color: i===0?"#ef4444":i===6?"#3b82f6":(isDark?"rgba(255,255,255,0.4)":"#94a3b8"), fontWeight: 600, padding: "8px 4px", textAlign: "center", borderBottom: `1px solid ${panelBorder}`, borderRight: i<6?`1px solid ${panelBorder}`:"none" }}>{d}</div>
        ))}
        {cells.map((d, i) => {
          const daySchedules = getSchedules(d);
          const isT = d && isSameDay(new Date(year, mon, d), today);
          const hasEvent = daySchedules.length > 0;
          return (
            <div key={i} onClick={() => d && hasEvent && onSelectDate?.(new Date(year, mon, d))}
              style={{
                minHeight: 56, padding: "4px 4px 2px", fontSize: 12, position: "relative",
                borderBottom: `1px solid ${panelBorder}`, borderRight: (i+1)%7!==0?`1px solid ${panelBorder}`:"none",
                background: d ? "transparent" : (isDark?"rgba(255,255,255,0.01)":"#fafafa"),
                cursor: d && hasEvent ? "pointer" : "default",
                transition: "background 0.12s",
              }}
              onMouseEnter={e => { if (d) e.currentTarget.style.background = hoverBg; }}
              onMouseLeave={e => { if (d) e.currentTarget.style.background = "transparent"; }}>
              <div style={{
                width: 24, height: 24, borderRadius: 99, display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: isT ? 700 : 400,
                background: isT ? ACC : "transparent", color: isT ? "#fff" : (isDark?"rgba(255,255,255,0.7)":"#333"),
                margin: "0 auto 2px",
              }}>
                {d || ""}
              </div>
              {daySchedules.slice(0,2).map((s,si) => (
                <div key={si}
                  onMouseEnter={() => setHoveredEvent(s)}
                  onMouseLeave={() => setHoveredEvent(null)}
                  style={{
                    fontSize: 10, fontWeight: 600, color: "#fff", padding: "2px 4px", borderRadius: 4, marginBottom: 1,
                    background: s.title?.includes("라이브") || s.duration ? "#ec4899" : ACC,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    transition: "transform 0.15s",
                  }}>
                  {s.title || new Date(s.date).toLocaleTimeString("ko-KR",{hour:"2-digit",minute:"2-digit"})}
                </div>
              ))}
              {daySchedules.length > 2 && (
                <div style={{ fontSize: 9, color: isDark?"rgba(255,255,255,0.35)":"#94a3b8", textAlign: "center" }}>+{daySchedules.length-2}</div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // ── 주간 뷰 ──
  const renderWeek = () => {
    const startOfWeek = new Date(month);
    startOfWeek.setDate(month.getDate() - month.getDay());
    const weekDays = Array.from({length:7}, (_,i) => { const d = new Date(startOfWeek); d.setDate(startOfWeek.getDate()+i); return d; });
    const hours = [9,10,11,12,13,14,15,16,17,18,19,20];

    return (
      <div style={{ overflowX: "auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "50px repeat(7,1fr)", minWidth: 500 }}>
          <div style={{ borderRight: `1px solid ${panelBorder}`, borderBottom: `1px solid ${panelBorder}`, padding: 4, fontSize: 10, color: isDark?"rgba(255,255,255,0.3)":"#94a3b8" }}>시간</div>
          {weekDays.map((d,i) => {
            const isT = isSameDay(d, today);
            return (
              <div key={i} style={{ borderRight: i<6?`1px solid ${panelBorder}`:"none", borderBottom: `1px solid ${panelBorder}`, padding: "6px 4px", textAlign: "center" }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: isT?ACC:(isDark?"rgba(255,255,255,0.5)":"#64748b") }}>{["일","월","화","수","목","금","토"][d.getDay()]}</div>
                <div style={{ fontSize: 13, fontWeight: isT?800:600, color: isT?"#fff":(isDark?"rgba(255,255,255,0.7)":"#333"), background: isT?ACC:"transparent", borderRadius: 99, width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", margin: "2px auto" }}>{d.getDate()}</div>
              </div>
            );
          })}
          {hours.map(h => (<>
            <div key={`t${h}`} style={{ borderRight: `1px solid ${panelBorder}`, borderBottom: `1px solid ${panelBorder}`, padding: "8px 4px", fontSize: 10, color: isDark?"rgba(255,255,255,0.3)":"#94a3b8" }}>{h}:00</div>
            {weekDays.map((d,i) => {
              const dayEvents = allSchedules.filter(s => { const sd = new Date(s.date); return isSameDay(sd, d) && sd.getHours()===h; });
              return (
                <div key={`${h}-${i}`} style={{ borderRight: i<6?`1px solid ${panelBorder}`:"none", borderBottom: `1px solid ${panelBorder}`, padding: 2, minHeight: 40, transition: "background 0.12s" }}
                  onMouseEnter={e=>e.currentTarget.style.background=hoverBg}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  {dayEvents.map((s,si) => (
                    <div key={si} onClick={() => onSelectDate?.(new Date(s.date))}
                      style={{ fontSize: 10, fontWeight: 600, color: "#fff", padding: "3px 5px", borderRadius: 4, background: "#ec4899", cursor: "pointer", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {s.title || `${h}:00`}
                    </div>
                  ))}
                </div>
              );
            })}
          </>))}
        </div>
      </div>
    );
  };

  // ── 리스트 뷰 ──
  const renderList = () => {
    const sorted = [...allSchedules].sort((a,b) => new Date(a.date) - new Date(b.date));
    const upcoming = sorted.filter(s => new Date(s.date) >= new Date(today.getFullYear(), today.getMonth(), today.getDate()));
    const grouped = {};
    upcoming.forEach(s => {
      const key = new Date(s.date).toLocaleDateString("ko-KR", { year:"numeric", month:"long", day:"numeric", weekday:"long" });
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(s);
    });

    return (
      <div style={{ padding: "8px 0" }}>
        {Object.entries(grouped).length === 0 && (
          <div style={{ textAlign: "center", padding: "32px 0", color: isDark?"rgba(255,255,255,0.35)":"#94a3b8", fontSize: 13 }}>예정된 일정이 없습니다</div>
        )}
        {Object.entries(grouped).map(([date, items]) => (
          <div key={date} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: isDark?"rgba(255,255,255,0.4)":"#94a3b8", marginBottom: 8, padding: "0 4px" }}>{date}</div>
            {items.map((s,i) => {
              const time = new Date(s.date);
              return (
                <div key={i} onClick={() => onSelectDate?.(time)}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, cursor: "pointer", marginBottom: 4, border: `1px solid ${panelBorder}`, transition: "all 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.background = hoverBg; e.currentTarget.style.transform = "translateX(4px)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.transform = "none"; }}>
                  <div style={{ width: 4, height: 28, borderRadius: 2, background: "#ec4899", flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.title || "라이브 방송"}</div>
                    <div style={{ fontSize: 11, color: isDark?"rgba(255,255,255,0.4)":"#94a3b8", display: "flex", gap: 8, marginTop: 2 }}>
                      <span>{time.toLocaleTimeString("ko-KR",{hour:"2-digit",minute:"2-digit"})}</span>
                      {s.duration && <span>{s.duration}</span>}
                      {s.maxSeats && <span>{s.enrolled||0}/{s.maxSeats}명</span>}
                    </div>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={isDark?"rgba(255,255,255,0.3)":"#94a3b8"} strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  // ── 호버 이벤트 카드 (floating) ──
  const renderHoverCard = () => {
    if (!hoveredEvent) return null;
    const time = new Date(hoveredEvent.date);
    return (
      <div style={{ position: "fixed", zIndex: 9999, pointerEvents: "none", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: panelBg, border: `1px solid ${panelBorder}`, borderRadius: 12, padding: "12px 16px", boxShadow: "0 12px 40px rgba(0,0,0,0.15)", minWidth: 200 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4 }}>{hoveredEvent.title || "라이브 방송"}</div>
        <div style={{ fontSize: 12, color: isDark?"rgba(255,255,255,0.5)":"#64748b", display: "flex", alignItems: "center", gap: 6 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          {time.toLocaleString("ko-KR",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}
        </div>
        {hoveredEvent.duration && <div style={{ fontSize: 11, color: isDark?"rgba(255,255,255,0.35)":"#94a3b8", marginTop: 2 }}>{hoveredEvent.duration}</div>}
        {hoveredEvent.maxSeats && (
          <div style={{ marginTop: 6 }}>
            <div style={{ fontSize: 10, color: isDark?"rgba(255,255,255,0.35)":"#94a3b8", marginBottom: 2 }}>{hoveredEvent.enrolled||0}/{hoveredEvent.maxSeats}명 참여</div>
            <div style={{ height: 4, borderRadius: 2, background: isDark?"rgba(255,255,255,0.06)":"#f0f0f5", overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 2, background: "#ec4899", width: `${Math.min(100,((hoveredEvent.enrolled||0)/hoveredEvent.maxSeats)*100)}%` }} />
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ background: panelBg, border: `1px solid ${panelBorder}`, borderRadius: 16, overflow: "hidden" }}>
      {/* 헤더 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderBottom: `1px solid ${panelBorder}`, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => {
            const d = new Date(month);
            if (view==="month") d.setMonth(d.getMonth()-1);
            else if (view==="week") d.setDate(d.getDate()-7);
            setMonth(d);
          }} style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${panelBorder}`, background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: isDark?"rgba(255,255,255,0.5)":"#64748b" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <button onClick={() => setMonth(new Date())} style={{ padding: "4px 12px", borderRadius: 8, border: `1px solid ${panelBorder}`, background: "transparent", cursor: "pointer", fontSize: 11, fontWeight: 600, color: isDark?"rgba(255,255,255,0.5)":"#64748b", fontFamily: "inherit" }}>오늘</button>
          <button onClick={() => {
            const d = new Date(month);
            if (view==="month") d.setMonth(d.getMonth()+1);
            else if (view==="week") d.setDate(d.getDate()+7);
            setMonth(d);
          }} style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${panelBorder}`, background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: isDark?"rgba(255,255,255,0.5)":"#64748b" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
          <span style={{ fontSize: 14, fontWeight: 800, color: C.text, marginLeft: 4 }}>
            {view === "month" ? `${year}년 ${mon+1}월` : view === "week" ? `${month.toLocaleDateString("ko-KR",{month:"short",day:"numeric"})} 주` : "일정 목록"}
          </span>
        </div>
        {/* 뷰 전환 */}
        <div style={{ display: "flex", gap: 2, background: isDark?"rgba(255,255,255,0.04)":"#f3f4f6", borderRadius: 8, padding: 2 }}>
          <button onClick={() => setView("month")} style={viewBtn("month")}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ marginRight: 3 }}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            월
          </button>
          <button onClick={() => setView("week")} style={viewBtn("week")}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ marginRight: 3 }}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
            주
          </button>
          <button onClick={() => setView("list")} style={viewBtn("list")}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ marginRight: 3 }}><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            목록
          </button>
        </div>
      </div>

      {/* 콘텐츠 */}
      {view === "month" && renderMonth()}
      {view === "week" && renderWeek()}
      {view === "list" && renderList()}

      {/* 하단 요약 */}
      <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 14px", borderTop: `1px solid ${panelBorder}`, fontSize: 11, color: isDark?"rgba(255,255,255,0.3)":"#94a3b8" }}>
        <span>{allSchedules.length}개 일정</span>
        <span>방금 업데이트</span>
      </div>

      {renderHoverCard()}
    </div>
  );
}

// ── 썸네일 슬라이드쇼 ──
function ClassSlideshow({ courses, C, isDark, onSelect }) {
  const [idx, setIdx] = useState(0);
  const withThumb = courses.filter(c => c.thumbnail);
  const total = withThumb.length || 1;

  useEffect(() => {
    if (total <= 1) return;
    const t = setInterval(() => setIdx(i => (i + 1) % total), 4000);
    return () => clearInterval(t);
  }, [total]);

  if (withThumb.length === 0) {
    return (
      <div style={{ background: isDark ? "linear-gradient(135deg,#1a1a3a,#0f0f25)" : "linear-gradient(135deg,#f0f0ff,#e8e0ff)", borderRadius: 16, height: "100%", minHeight: 240, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8 }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={ACC} strokeWidth="1.5"><polygon points="5 3 19 12 5 21 5 3" /></svg>
        <span style={{ fontSize: 14, color: C.muted, fontWeight: 600 }}>등록된 강의가 없습니다</span>
      </div>
    );
  }

  const cur = withThumb[idx % total];
  return (
    <div onClick={() => onSelect?.(cur)}
      style={{ borderRadius: 16, overflow: "hidden", position: "relative", cursor: "pointer", height: "100%", minHeight: 240 }}>
      {/* 이미지 */}
      <div style={{ width: "100%", height: "100%", minHeight: 240, background: `url(${cur.thumbnail}) center/cover no-repeat`, transition: "background-image 0.5s ease" }} />
      {/* 오버레이 */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(transparent 40%, rgba(0,0,0,0.7))", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "20px" }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
          <span style={{ padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 800, color: "#fff", background: cur.type === "vod" ? "rgba(0,0,0,0.06)" : "rgba(236,72,153,0.85)", backdropFilter: "blur(4px)" }}>
            {cur.type === "vod" ? "VOD" : cur.type === "zoom" ? "LIVE" : "오프라인"}
          </span>
          <span style={{ padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 800, color: "#fff", background: cur.pricing === "free" ? "rgba(34,197,94,0.85)" : "rgba(249,115,22,0.85)" }}>
            {cur.pricing === "free" ? "무료" : `${cur.price?.toLocaleString()}원`}
          </span>
        </div>
        <div style={{ fontSize: 18, fontWeight: 900, color: "#fff", marginBottom: 4, textShadow: "0 1px 4px rgba(0,0,0,0.3)" }}>{cur.title}</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>{cur.instructor} · {(cur.lessons||[]).length || (cur.liveSchedules||[]).length}개 강의</div>
      </div>
      {/* 인디케이터 */}
      {total > 1 && (
        <div style={{ position: "absolute", bottom: 12, right: 16, display: "flex", gap: 4 }}>
          {withThumb.map((_, i) => (
            <div key={i} onClick={e => { e.stopPropagation(); setIdx(i); }}
              style={{ width: idx === i ? 20 : 6, height: 6, borderRadius: 3, background: idx === i ? "#fff" : "rgba(255,255,255,0.4)", transition: "all 0.2s", cursor: "pointer" }} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── 과제 제출 모달 ──
function AssignmentModal({ lesson, C, isDark, onClose, onSubmit, user, classId }) {
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (!file || !user?.uid) return;
    setSubmitting(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `assignments/${classId}/${lesson.id}_${user.uid}_${Date.now()}.${ext}`;
      await supabase.storage.from("public-assets").upload(path, file, { contentType: file.type, upsert: true });
      const { data: urlData } = supabase.storage.from("public-assets").getPublicUrl(path);
      await supabase.from("class_progress").upsert({
        class_id: classId, lesson_id: lesson.id, uid: user.uid,
        assignment_submitted: true, assignment_file: urlData.publicUrl, updated_at: new Date().toISOString(),
      }, { onConflict: "lesson_id,uid" });
      setDone(true);
      onSubmit?.(lesson.id);
    } catch (e) {}
    setSubmitting(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: isDark ? "#181836" : "#fff", borderRadius: 20, padding: "32px 28px", maxWidth: 440, width: "100%", boxShadow: "0 24px 80px rgba(0,0,0,0.4)" }}>
        {done ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: GRAD, margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, color: "#fff" }}>✓</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: C.text, marginBottom: 8 }}>과제 제출 완료!</div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>다음 강의가 잠금 해제되었습니다.</div>
            <button onClick={onClose} style={{ padding: "12px 32px", borderRadius: 12, border: "none", background: GRAD, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>확인</button>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 18, fontWeight: 900, color: C.text, marginBottom: 6 }}>과제 제출</div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>{lesson.assignmentDesc}</div>
            <label style={{ display: "block", padding: "32px 16px", borderRadius: 14, border: `2px dashed ${file ? ACC : C.border}`, background: file ? `${ACC}08` : "transparent", cursor: "pointer", textAlign: "center", marginBottom: 16 }}>
              <input type="file" accept="image/*,.pdf,.zip,.doc,.docx" style={{ display: "none" }} onChange={e => { if (e.target.files?.[0]) setFile(e.target.files[0]); }} />
              {file ? (
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{file.name}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{(file.size / 1024 / 1024).toFixed(1)} MB</div>
                </div>
              ) : (
                <div>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="1.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                  <div style={{ fontSize: 13, color: C.muted, marginTop: 8 }}>스크린샷 또는 파일을 업로드하세요</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>이미지, PDF, ZIP, DOC 지원</div>
                </div>
              )}
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={onClose} style={{ flex: 1, padding: "12px", borderRadius: 12, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>취소</button>
              <button onClick={handleSubmit} disabled={!file || submitting}
                style={{ flex: 1, padding: "12px", borderRadius: 12, border: "none", background: !file ? "rgba(0,0,0,0.06)" : GRAD, color: "#fff", fontSize: 13, fontWeight: 700, cursor: !file ? "default" : "pointer" }}>
                {submitting ? "제출 중..." : "제출하기"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── 리치 텍스트 에디터 ──
function RichEditor({ value, onChange, placeholder, C, isDark }) {
  const ref = useRef(null);
  const exec = (cmd, val) => { document.execCommand(cmd, false, val); ref.current?.focus(); };
  const insertImage = () => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = "image/*";
    input.onchange = (e) => {
      const f = e.target.files?.[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = (ev) => { exec("insertImage", ev.target.result); };
      reader.readAsDataURL(f);
    };
    input.click();
  };

  const lastExternal = useRef(value);
  useEffect(() => {
    if (ref.current && value !== lastExternal.current) {
      ref.current.innerHTML = value || "";
      lastExternal.current = value;
    }
  }, [value]);

  const tb = { display: "flex", gap: 2, padding: "8px 10px", borderBottom: "1px solid " + C.border, flexWrap: "wrap", background: isDark ? "rgba(255,255,255,0.03)" : "#fafbfc" };
  const tbtn = (active) => ({ padding: "4px 8px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, background: active ? `${ACC}15` : "transparent", color: active ? ACC : C.muted, fontFamily: "inherit", minWidth: 28, textAlign: "center" });

  return (
    <div style={{ border: "1px solid " + C.border, borderRadius: 12, overflow: "hidden" }}>
      <div style={tb}>
        <button onClick={() => exec("bold")} style={tbtn()} title="굵게"><b>B</b></button>
        <button onClick={() => exec("italic")} style={tbtn()} title="기울임"><i>I</i></button>
        <button onClick={() => exec("underline")} style={tbtn()} title="밑줄"><u>U</u></button>
        <div style={{ width: 1, height: 20, background: C.border, margin: "0 4px", alignSelf: "center" }} />
        <button onClick={() => exec("formatBlock", "h2")} style={tbtn()} title="제목">H2</button>
        <button onClick={() => exec("formatBlock", "h3")} style={tbtn()} title="소제목">H3</button>
        <button onClick={() => exec("formatBlock", "p")} style={tbtn()} title="본문">P</button>
        <div style={{ width: 1, height: 20, background: C.border, margin: "0 4px", alignSelf: "center" }} />
        <button onClick={() => exec("insertUnorderedList")} style={tbtn()} title="목록">UL</button>
        <button onClick={() => exec("insertOrderedList")} style={tbtn()} title="순서목록">OL</button>
        <div style={{ width: 1, height: 20, background: C.border, margin: "0 4px", alignSelf: "center" }} />
        <button onClick={insertImage} style={tbtn()} title="이미지 삽입">IMG</button>
        <button onClick={() => { const url = prompt("링크 URL"); if (url) exec("createLink", url); }} style={tbtn()} title="링크">LINK</button>
        <div style={{ width: 1, height: 20, background: C.border, margin: "0 4px", alignSelf: "center" }} />
        <select onChange={e => { if (e.target.value) exec("fontSize", e.target.value); }} defaultValue=""
          style={{ padding: "3px 6px", borderRadius: 6, border: "1px solid " + C.border, background: "transparent", color: C.muted, fontSize: 11, outline: "none" }}>
          <option value="" disabled>크기</option>
          <option value="2">작게</option>
          <option value="3">보통</option>
          <option value="4">크게</option>
          <option value="5">아주 크게</option>
        </select>
        <select onChange={e => { if (e.target.value) exec("foreColor", e.target.value); }} defaultValue=""
          style={{ padding: "3px 6px", borderRadius: 6, border: "1px solid " + C.border, background: "transparent", color: C.muted, fontSize: 11, outline: "none" }}>
          <option value="" disabled>색상</option>
          <option value="#000000">검정</option>
          <option value="#3b82f6">보라</option>
          <option value="#ec4899">핑크</option>
          <option value="#ef4444">빨강</option>
          <option value="#22c55e">초록</option>
          <option value="#3b82f6">파랑</option>
        </select>
      </div>
      <div ref={ref} contentEditable suppressContentEditableWarning
        onInput={() => { const html = ref.current?.innerHTML || ""; lastExternal.current = html; onChange?.(html); }}
        data-placeholder={placeholder}
        style={{
          minHeight: 240, padding: "16px 18px", outline: "none", fontSize: 14, lineHeight: 1.8,
          color: C.text, fontFamily: "inherit", overflowY: "auto", maxHeight: 500,
          background: isDark ? "rgba(255,255,255,0.02)" : "#fff",
        }} />
      <style>{`[contenteditable]:empty:before{content:attr(data-placeholder);color:${C.muted};pointer-events:none;} [contenteditable] img{max-width:100%;border-radius:8px;margin:8px 0;} [contenteditable] h2{font-size:20px;font-weight:800;margin:16px 0 8px;} [contenteditable] h3{font-size:16px;font-weight:700;margin:12px 0 6px;}`}</style>
    </div>
  );
}

// ── 강의 관리 페이지 (탭 기반) ──
function CourseEditorPage({ course, C, isDark, onClose, onSave }) {
  const [form, setForm] = useState(course || {
    title: "", desc: "", type: "vod", pricing: "free", price: 0,
    freePreviewCount: 2, memberVisibleCount: 5, tags: [],
    thumbnail: null, lessons: [], liveSchedules: [],
    introHtml: "", targetAudience: "", process: "", notes: "", instructorBio: "",
    difficulty: "입문", durationInfo: "무제한",
  });
  const [thumbPreview, setThumbPreview] = useState(course?.thumbnail || "");
  const [tagInput, setTagInput] = useState("");
  const [lessonForm, setLessonForm] = useState({ title: "", duration: "", videoFile: null, videoName: "", isFreePreview: false, assignmentRequired: false, assignmentDesc: "" });
  const [liveForm, setLiveForm] = useState({ date: "", title: "", duration: "60분", maxSeats: 30 });
  const [tab, setTab] = useState("info"); // info | curriculum | payment | settings
  const [aiGenerating, setAiGenerating] = useState(false);

  const [uploading, setUploading] = useState("");
  const handleThumb = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    // 미리보기 즉시 표시
    const reader = new FileReader();
    reader.onload = (ev) => setThumbPreview(ev.target.result);
    reader.readAsDataURL(f);
    // Supabase Storage 업로드
    setUploading("썸네일 업로드 중...");
    const ext = f.name.split(".").pop();
    const path = `classes/thumb_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("public-assets").upload(path, f, { contentType: f.type, upsert: true });
    if (error) { setUploading("업로드 실패: " + error.message); setTimeout(() => setUploading(""), 3000); return; }
    const { data: urlData } = supabase.storage.from("public-assets").getPublicUrl(path);
    setForm(prev => ({ ...prev, thumbnail: urlData.publicUrl }));
    setThumbPreview(urlData.publicUrl);
    setUploading("");
  };

  const addLesson = async () => {
    if (!lessonForm.title) return;
    let videoSrc = null;
    // 영상 파일이 있으면 Supabase Storage에 업로드
    if (lessonForm.videoFile instanceof File) {
      setUploading(`영상 업로드 중... (${(lessonForm.videoFile.size/1024/1024).toFixed(0)}MB)`);
      const ext = lessonForm.videoFile.name.split(".").pop();
      const path = `classes/video_${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("public-assets").upload(path, lessonForm.videoFile, { contentType: lessonForm.videoFile.type, upsert: true });
      if (error) { setUploading("업로드 실패: " + error.message); setTimeout(() => setUploading(""), 3000); return; }
      const { data: urlData } = supabase.storage.from("public-assets").getPublicUrl(path);
      videoSrc = urlData.publicUrl;
      setUploading("");
    }
    const newLesson = { ...lessonForm, id: "l_" + Date.now(), order: form.lessons.length + 1, videoSrc, videoFile: null };
    setForm(prev => ({ ...prev, lessons: [...prev.lessons, newLesson] }));
    setLessonForm({ title: "", duration: "", videoFile: null, videoName: "", isFreePreview: false, assignmentRequired: false, assignmentDesc: "" });
  };

  const addLiveSchedule = () => {
    if (!liveForm.date || !liveForm.title) return;
    setForm(prev => ({ ...prev, liveSchedules: [...prev.liveSchedules, { ...liveForm, id: "ls_" + Date.now(), enrolled: 0 }] }));
    setLiveForm({ date: "", title: "", duration: "60분", maxSeats: 30 });
  };

  const addTag = () => {
    if (tagInput.trim() && !form.tags.includes(tagInput.trim())) {
      setForm(prev => ({ ...prev, tags: [...prev.tags, tagInput.trim()] }));
      setTagInput("");
    }
  };

  const moveLesson = (idx, dir) => {
    const arr = [...form.lessons];
    const target = idx + dir;
    if (target < 0 || target >= arr.length) return;
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    arr.forEach((l, i) => l.order = i + 1);
    setForm(prev => ({ ...prev, lessons: arr }));
  };

  const inp = { width: "100%", padding: "12px 16px", borderRadius: 12, border: "1px solid " + C.border, background: isDark ? "rgba(255,255,255,0.05)" : "#fff", color: C.text, fontSize: 14, outline: "none", fontFamily: "inherit", boxSizing: "border-box" };
  const lbl = { fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 8, display: "block" };
  const section = { background: C.card, border: "1px solid " + C.border, borderRadius: 16, padding: "24px", marginBottom: 16 };
  const sectionTitle = { fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 };

  // AI 소개글 자동 생성 (썸네일/영상 파일 감지)
  const generateIntro = async () => {
    setAiGenerating(true);
    const title = form.title || "새 클래스";
    const desc = form.desc || "이 강의에서는 실전 노하우를 배울 수 있습니다.";
    const hasThumb = !!form.thumbnail;
    const hasVideo = form.lessons?.some(l => l.videoFile);
    const videoNames = form.lessons?.filter(l => l.videoName).map(l => l.videoName) || [];
    // 파일 분석 시뮬레이션 (실제로는 AI API 호출)
    if (hasThumb || hasVideo) await new Promise(r => setTimeout(r, 2500));
    else await new Promise(r => setTimeout(r, 1500));
    let mediaNote = "";
    if (hasThumb) mediaNote += `<p style="color:#3b82f6;font-size:12px;">* 썸네일 이미지가 분석되었습니다.</p>`;
    if (hasVideo) mediaNote += `<p style="color:#3b82f6;font-size:12px;">* 영상 ${videoNames.length}개 분석 완료: ${videoNames.join(", ")}</p>`;
    const lessonList = form.lessons?.length > 0
      ? `<h3>커리큘럼 미리보기</h3><ol>${form.lessons.map(l => `<li><b>${l.title}</b> (${l.duration || "시간 미정"})</li>`).join("")}</ol>`
      : "";
    const generated = `${mediaNote}<h2>${title}</h2><p>${desc}</p><h3>이런 분들에게 추천해요</h3><ul><li>해당 분야를 처음 시작하는 분</li><li>실무 능력을 빠르게 키우고 싶은 분</li><li>체계적인 학습이 필요한 분</li></ul><h3>강의를 듣고 나면</h3><ul><li>실전에서 바로 적용 가능한 전략을 세울 수 있어요</li><li>효율적인 워크플로우를 완성할 수 있어요</li></ul>${lessonList}<h3>클래스 유의사항</h3><ul><li>강의 자료는 수강 기간 내 무제한 시청 가능합니다</li><li>과제 미제출 시 다음 강의가 잠금됩니다</li></ul>`;
    setForm(p => ({ ...p, introHtml: generated }));
    setAiGenerating(false);
  };

  // AI 기본정보 자동 생성 (제목+파일 기반)
  const generateInfo = async () => {
    if (!form.title) return;
    setAiGenerating(true);
    const hasMedia = !!form.thumbnail || form.lessons?.some(l => l.videoFile);
    await new Promise(r => setTimeout(r, hasMedia ? 2000 : 1200));
    const mediaInfo = hasMedia ? " 업로드된 미디어를 분석하여 최적화된 내용으로 작성했습니다." : "";
    const descMap = {
      default: `${form.title} 강의입니다. 실무에서 바로 활용할 수 있는 핵심 내용만 담았습니다. 초보자도 쉽게 따라할 수 있도록 단계별로 구성했어요.${mediaInfo}`,
    };
    const tagSuggestions = form.title.includes("마케팅") ? ["마케팅","SNS","실전","초급"] : form.title.includes("AI") ? ["AI","자동화","생산성","입문"] : form.title.includes("블로그") ? ["블로그","수익화","글쓰기","SEO"] : form.title.includes("영상") ? ["영상","편집","유튜브","콘텐츠"] : ["온라인강의","실전","입문","스킬업"];
    setForm(p => ({
      ...p,
      desc: p.desc || descMap.default,
      tags: p.tags.length > 0 ? p.tags : tagSuggestions,
    }));
    setAiGenerating(false);
  };

  // AI 커리큘럼 자동 생성
  const generateCurriculum = async () => {
    setAiGenerating(true);
    await new Promise(r => setTimeout(r, 1500));
    const title = form.title || "클래스";
    const newLessons = [
      { id: "al_1", order: 1, title: `${title} 소개 & 오리엔테이션`, duration: "05:00", isFreePreview: true, assignmentRequired: false, assignmentDesc: "" },
      { id: "al_2", order: 2, title: "핵심 개념 이해하기", duration: "12:00", isFreePreview: true, assignmentRequired: false, assignmentDesc: "" },
      { id: "al_3", order: 3, title: "실전 도구 셋업 & 환경 구성", duration: "15:00", isFreePreview: false, assignmentRequired: true, assignmentDesc: "도구 셋업 완료 후 스크린샷을 제출하세요." },
      { id: "al_4", order: 4, title: "기초 실습 — 첫 번째 결과물 만들기", duration: "20:00", isFreePreview: false, assignmentRequired: true, assignmentDesc: "첫 번째 결과물을 제출하세요." },
      { id: "al_5", order: 5, title: "심화 전략 & 응용 기법", duration: "18:00", isFreePreview: false, assignmentRequired: false, assignmentDesc: "" },
      { id: "al_6", order: 6, title: "실전 프로젝트 완성", duration: "25:00", isFreePreview: false, assignmentRequired: true, assignmentDesc: "최종 프로젝트 결과물을 제출하세요." },
      { id: "al_7", order: 7, title: "마무리 & 다음 단계 안내", duration: "08:00", isFreePreview: false, assignmentRequired: false, assignmentDesc: "" },
    ];
    setForm(p => ({ ...p, lessons: p.lessons.length > 0 ? p.lessons : newLessons }));
    setAiGenerating(false);
  };

  // AI 대상/진행방식/유의사항 자동 생성
  const generateDetails = async () => {
    setAiGenerating(true);
    await new Promise(r => setTimeout(r, 1200));
    const title = form.title || "이 클래스";
    setForm(p => ({
      ...p,
      targetAudience: p.targetAudience || `- ${title} 분야에 관심이 있지만 어디서부터 시작해야 할지 모르는 분\n- 기초는 알지만 실전 경험이 부족한 분\n- 최신 트렌드와 도구를 활용하고 싶은 분\n- 부업이나 수익화를 목표로 하는 분`,
      process: p.process || `1주차: 기본 개념 학습 + 도구 셋업\n2주차: 핵심 기법 실습 + 과제\n3주차: 심화 전략 + 실전 프로젝트\n4주차: 최종 결과물 완성 + 피드백\n\n매 강의 후 과제를 제출하면 다음 강의가 열립니다.`,
      notes: p.notes || `- 강의 영상은 수강 기간 동안 무제한 반복 시청 가능합니다.\n- 과제 미제출 시 다음 강의가 잠금됩니다.\n- 질문은 커뮤니티 게시판을 통해 남겨주세요.\n- 환불은 수강 시작 후 7일 이내 가능합니다.`,
    }));
    setAiGenerating(false);
  };

  const TABS = [
    { id: "info", label: "일반 설정", icon: "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" },
    { id: "intro", label: "클래스 소개", icon: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" },
    { id: "curriculum", label: form.type === "vod" ? "강의 설정" : "일정 설정", icon: "M5 3l14 9-14 9V3z" },
    { id: "payment", label: "결제 설정", icon: "M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" },
    { id: "settings", label: "고급 설정", icon: "M12 2a10 10 0 100 20 10 10 0 000-20z" },
  ];

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 20px 80px" }}>
      {/* 헤더 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={onClose}
            style={{ display: "flex", alignItems: "center", gap: 4, padding: "8px 14px", borderRadius: 10, border: "1px solid " + C.border, background: "transparent", color: C.text, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
            목록으로
          </button>
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, color: C.text }}>{course ? form.title || "강의 수정" : "새 강의 등록"}</div>
          </div>
        </div>
        <button onClick={() => { onSave?.(form); onClose(); }} disabled={!form.title}
          style={{ padding: "10px 24px", borderRadius: 12, border: "none", background: !form.title ? "rgba(0,0,0,0.06)" : GRAD, color: "#fff", fontSize: 14, fontWeight: 800, cursor: !form.title ? "default" : "pointer" }}>
          {course ? "변경사항 저장하기" : "클래스 등록하기"}
        </button>
      </div>

      {/* 탭 네비 */}
      <div style={{ display: "flex", gap: 0, borderBottom: "2px solid " + C.border, marginBottom: 24 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: "12px 20px", border: "none", borderBottom: tab === t.id ? `3px solid ${ACC}` : "3px solid transparent", background: "transparent", color: tab === t.id ? ACC : C.muted, fontSize: 14, fontWeight: tab === t.id ? 800 : 500, cursor: "pointer", fontFamily: "inherit", marginBottom: -2, display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d={t.icon} /></svg>
            {t.label}
          </button>
        ))}
      </div>

      {/* ═══ 일반 설정 ═══ */}
      {tab === "info" && (
        <div>
          {/* AI 자동채우기 */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            <button onClick={generateInfo} disabled={aiGenerating || !form.title}
              style={{ padding: "8px 16px", borderRadius: 10, border: "none", background: (aiGenerating || !form.title) ? "rgba(0,0,0,0.06)" : GRAD, color: "#fff", fontSize: 12, fontWeight: 700, cursor: (aiGenerating || !form.title) ? "default" : "pointer" }}>
              {aiGenerating ? "AI 생성 중..." : "AI로 소개 + 태그 자동 생성"}
            </button>
          </div>
          {/* 썸네일 */}
          <div style={section}>
            <div style={sectionTitle}>썸네일 이미지</div>
            <label style={{ display: "block", cursor: "pointer" }}>
              <div style={{ width: "100%", height: 220, borderRadius: 14, border: thumbPreview ? "none" : `2px dashed ${C.border}`, background: thumbPreview ? `url(${thumbPreview}) center/cover no-repeat` : (isDark ? "rgba(255,255,255,0.03)" : "#f8f9fb"), display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8, overflow: "hidden", position: "relative" }}>
                {!thumbPreview ? <>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="1.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                  <span style={{ fontSize: 14, color: C.muted, fontWeight: 600 }}>클릭하여 썸네일 업로드</span>
                  <span style={{ fontSize: 11, color: C.muted }}>권장: 1280x720 (16:9)</span>
                </> : (
                  <div style={{ position: "absolute", bottom: 12, left: 12, display: "flex", gap: 6 }}>
                    <span style={{ padding: "6px 14px", borderRadius: 8, background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 12, fontWeight: 600, backdropFilter: "blur(4px)" }}>이미지 변경하기</span>
                  </div>
                )}
              </div>
              <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleThumb} />
            </label>
          </div>

          {/* 기본 정보 */}
          <div style={section}>
            <div style={sectionTitle}>기본 정보</div>
            <div style={{ marginBottom: 16 }}>
              <span style={lbl}>클래스 제목 *</span>
              <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="이름을 입력해 주세요" style={{ ...inp, fontSize: 18, fontWeight: 700, padding: "14px 16px" }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <span style={lbl}>간단 소개</span>
              <textarea value={form.desc} onChange={e => setForm(p => ({ ...p, desc: e.target.value }))} placeholder="클래스를 한 줄로 소개해 주세요" rows={2} style={{ ...inp, resize: "vertical", lineHeight: 1.6 }} />
            </div>

            {/* 유형 */}
            <div style={{ marginBottom: 16 }}>
              <span style={lbl}>어떤 목적으로 개설하시나요?</span>
              <div style={{ display: "flex", gap: 8 }}>
                {[["vod", "동영상"], ["zoom", "라이브 미팅"], ["offline", "오프라인 모임"]].map(([v, l]) => (
                  <button key={v} onClick={() => setForm(p => ({ ...p, type: v }))}
                    style={{ padding: "10px 20px", borderRadius: 10, border: form.type === v ? `2px solid ${ACC}` : "1px solid " + C.border, background: form.type === v ? `${ACC}08` : "transparent", color: form.type === v ? ACC : C.muted, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* 태그 */}
            <div>
              <span style={lbl}>태그</span>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                {form.tags.map(t => (
                  <span key={t} onClick={() => setForm(p => ({ ...p, tags: p.tags.filter(x => x !== t) }))}
                    style={{ padding: "5px 12px", borderRadius: 20, background: `${ACC}10`, color: ACC, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{t} x</span>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addTag())} placeholder="태그 입력 후 Enter" style={{ ...inp, flex: 1 }} />
                <button onClick={addTag} style={{ padding: "10px 20px", borderRadius: 12, border: "none", background: ACC, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>추가</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ 클래스 소개 (리치 에디터) ═══ */}
      {tab === "intro" && (
        <div>
          <div style={section}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={sectionTitle}>클래스 소개 페이지</div>
              <button onClick={generateIntro} disabled={aiGenerating}
                style={{ padding: "8px 16px", borderRadius: 10, border: "none", background: aiGenerating ? "rgba(0,0,0,0.06)" : GRAD, color: "#fff", fontSize: 12, fontWeight: 700, cursor: aiGenerating ? "default" : "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                {aiGenerating ? (form.thumbnail || form.lessons?.some(l=>l.videoFile) ? "미디어 분석 + AI 생성 중..." : "AI 생성 중...") : "AI로 소개글 자동 작성"}
              </button>
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>
              이미지, 텍스트, 링크를 자유롭게 구성하세요. 영상이나 이미지를 올리면 AI가 내용을 분석하여 1차 소개글을 자동 생성합니다.
            </div>
            <RichEditor value={form.introHtml} onChange={v => setForm(p => ({ ...p, introHtml: v }))} placeholder="클래스 소개를 작성해 주세요. 이미지를 직접 삽입할 수 있습니다." C={C} isDark={isDark} />
          </div>

          {/* AI 대상/진행방식/유의사항 한번에 */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            <button onClick={generateDetails} disabled={aiGenerating}
              style={{ padding: "8px 16px", borderRadius: 10, border: "none", background: aiGenerating ? "rgba(0,0,0,0.06)" : GRAD, color: "#fff", fontSize: 12, fontWeight: 700, cursor: aiGenerating ? "default" : "pointer" }}>
              {aiGenerating ? "AI 생성 중..." : "AI로 아래 항목 자동 작성"}
            </button>
          </div>

          <div style={section}>
            <div style={sectionTitle}>이런 분들이 들으면 좋아요</div>
            <textarea value={form.targetAudience} onChange={e => setForm(p => ({ ...p, targetAudience: e.target.value }))} placeholder="모든 분들이 수강하면 좋으시지만, 그 중에서도 어떤 분들에게 가장 필요한 클래스인지 구체적으로 적어주세요." rows={4} style={{ ...inp, resize: "vertical", lineHeight: 1.7 }} />
          </div>

          <div style={section}>
            <div style={sectionTitle}>클래스는 이렇게 진행됩니다</div>
            <textarea value={form.process} onChange={e => setForm(p => ({ ...p, process: e.target.value }))} placeholder="클래스를 수강하면 어떤 강의를 어떤 순서로 배울 수 있는지 수강생이 상상할 수 있도록 해주세요." rows={4} style={{ ...inp, resize: "vertical", lineHeight: 1.7 }} />
          </div>

          <div style={section}>
            <div style={sectionTitle}>클래스 유의사항</div>
            <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="클래스를 신청할 분들이 꼭 알아야하는 정보가 있다면 작성해주세요." rows={3} style={{ ...inp, resize: "vertical", lineHeight: 1.7 }} />
          </div>

          <div style={section}>
            <div style={sectionTitle}>강사 소개</div>
            <RichEditor value={form.instructorBio} onChange={v => setForm(p => ({ ...p, instructorBio: v }))} placeholder="강사 프로필, 이력, 포트폴리오 등을 자유롭게 작성하세요." C={C} isDark={isDark} />
          </div>
        </div>
      )}

      {/* ═══ 강의/일정 설정 ═══ */}
      {tab === "curriculum" && (
        <div>
          {/* AI 커리큘럼 자동 생성 */}
          {form.type === "vod" && form.lessons.length === 0 && (
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
              <button onClick={generateCurriculum} disabled={aiGenerating}
                style={{ padding: "8px 16px", borderRadius: 10, border: "none", background: aiGenerating ? "rgba(0,0,0,0.06)" : GRAD, color: "#fff", fontSize: 12, fontWeight: 700, cursor: aiGenerating ? "default" : "pointer" }}>
                {aiGenerating ? "AI 생성 중..." : "AI로 커리큘럼 자동 구성"}
              </button>
            </div>
          )}
          {form.type === "vod" ? (
            <div style={section}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <div style={sectionTitle}>강의 리스트</div>
              </div>
              <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: C.muted, cursor: "pointer" }}>
                  <input type="checkbox" defaultChecked /> 순서대로 강의 진행
                </label>
              </div>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>강의를 추가하여 커리큘럼을 구성할 수 있습니다.</div>

              {/* 등록된 레슨 */}
              {form.lessons.map((l, i) => (
                <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderRadius: 12, border: "1px solid " + C.border, background: C.card, marginBottom: 6 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2, flexShrink: 0 }}>
                    <button onClick={() => moveLesson(i, -1)} disabled={i === 0} style={{ background: "none", border: "none", cursor: i === 0 ? "default" : "pointer", color: i === 0 ? C.border : C.muted, fontSize: 10, padding: 0, lineHeight: 1 }}>▲</button>
                    <button onClick={() => moveLesson(i, 1)} disabled={i === form.lessons.length - 1} style={{ background: "none", border: "none", cursor: i === form.lessons.length - 1 ? "default" : "pointer", color: i === form.lessons.length - 1 ? C.border : C.muted, fontSize: 10, padding: 0, lineHeight: 1 }}>▼</button>
                  </div>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: l.videoFile ? `${ACC}15` : (isDark ? "rgba(255,255,255,0.06)" : "#f0f0f5"), display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {l.videoFile ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={ACC} strokeWidth="2" strokeLinecap="round"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                    ) : (
                      <span style={{ fontSize: 12, fontWeight: 800, color: C.muted }}>{l.order}</span>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{l.title}</div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                      {l.videoName || "영상 미등록"}{l.duration ? ` · ${l.duration}` : ""}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                    {l.isFreePreview && <span style={{ padding: "3px 8px", borderRadius: 6, background: "rgba(34,197,94,0.1)", color: "#22c55e", fontSize: 10, fontWeight: 700 }}>무료</span>}
                    {l.assignmentRequired && <span style={{ padding: "3px 8px", borderRadius: 6, background: "rgba(249,115,22,0.1)", color: "#f59e0b", fontSize: 10, fontWeight: 700 }}>과제</span>}
                  </div>
                  <button onClick={() => setForm(p => ({ ...p, lessons: p.lessons.filter(x => x.id !== l.id).map((x, j) => ({ ...x, order: j + 1 })) }))}
                    style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 18, padding: "4px" }}>x</button>
                </div>
              ))}

              {/* 새 강의 추가 */}
              <div style={{ background: isDark ? "rgba(0,0,0,0.06)" : "rgba(0,0,0,0.06)", border: `1px dashed ${ACC}40`, borderRadius: 14, padding: "20px", marginTop: 12 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 14 }}>강의 추가</div>
                <div style={{ marginBottom: 12 }}>
                  <span style={lbl}>강의명 *</span>
                  <input value={lessonForm.title} onChange={e => setLessonForm(p => ({ ...p, title: e.target.value }))} placeholder="예: 1강. SNS 마케팅 기초 이론" style={inp} />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <span style={lbl}>영상 파일</span>
                  <label style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px", borderRadius: 12, border: `2px dashed ${lessonForm.videoFile ? ACC : C.border}`, background: lessonForm.videoFile ? `${ACC}05` : "transparent", cursor: "pointer" }}>
                    <input type="file" accept="video/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) setLessonForm(p => ({ ...p, videoFile: f, videoName: f.name })); }} />
                    {lessonForm.videoFile ? (<>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: `${ACC}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={ACC} strokeWidth="2" strokeLinecap="round"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{lessonForm.videoFile.name}</div>
                        <div style={{ fontSize: 12, color: C.muted }}>{(lessonForm.videoFile.size / 1024 / 1024).toFixed(1)} MB</div>
                      </div>
                      <button onClick={e => { e.preventDefault(); setLessonForm(p => ({ ...p, videoFile: null, videoName: "" })); }}
                        style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid " + C.border, background: "transparent", color: C.muted, fontSize: 11, cursor: "pointer" }}>변경</button>
                    </>) : (<>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: isDark ? "rgba(255,255,255,0.06)" : "#f0f0f5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="1.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>+ 동영상 선택</div>
                        <div style={{ fontSize: 12, color: C.muted }}>MP4, MOV, AVI · 최대 2GB</div>
                      </div>
                    </>)}
                  </label>
                  <div style={{ fontSize: 11, color: ACC, marginTop: 6 }}>
                    영상 업로드 시 자동: 자막 추출 → 다국어 번역 → 음성 변환 → 강의 요약 생성
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                  <div><span style={lbl}>재생 시간</span><input value={lessonForm.duration} onChange={e => setLessonForm(p => ({ ...p, duration: e.target.value }))} placeholder="15:30" style={inp} /></div>
                  <div>
                    <span style={lbl}>옵션</span>
                    <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: C.muted, cursor: "pointer" }}>
                        <input type="checkbox" checked={lessonForm.isFreePreview} onChange={e => setLessonForm(p => ({ ...p, isFreePreview: e.target.checked }))} /> 무료 공개
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: C.muted, cursor: "pointer" }}>
                        <input type="checkbox" checked={lessonForm.assignmentRequired} onChange={e => setLessonForm(p => ({ ...p, assignmentRequired: e.target.checked }))} /> 과제
                      </label>
                    </div>
                  </div>
                </div>
                {lessonForm.assignmentRequired && (
                  <div style={{ marginBottom: 12 }}><span style={lbl}>과제 설명</span><input value={lessonForm.assignmentDesc} onChange={e => setLessonForm(p => ({ ...p, assignmentDesc: e.target.value }))} placeholder="수강생에게 보여줄 과제 내용" style={inp} /></div>
                )}
                {uploading && <div style={{ padding: "10px 14px", borderRadius: 10, background: `${ACC}10`, color: ACC, fontSize: 13, fontWeight: 700, marginBottom: 8, textAlign: "center" }}>{uploading}</div>}
                <button onClick={addLesson} disabled={!lessonForm.title || !!uploading}
                  style={{ width: "100%", padding: "13px", borderRadius: 12, border: "none", background: (!lessonForm.title || uploading) ? "rgba(0,0,0,0.06)" : ACC, color: "#fff", fontSize: 14, fontWeight: 800, cursor: (!lessonForm.title || uploading) ? "default" : "pointer" }}>
                  {uploading ? "업로드 중..." : "강의 추가"}
                </button>
              </div>
            </div>
          ) : (
            <div style={section}>
              <div style={sectionTitle}>{form.type === "zoom" ? "라이브" : "오프라인"} 일정</div>
              {form.liveSchedules.map(s => (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 12, border: "1px solid " + C.border, background: C.card, marginBottom: 6 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: GRAD, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 900, flexShrink: 0, textAlign: "center", lineHeight: 1.1 }}>
                    {new Date(s.date).getMonth()+1}/{new Date(s.date).getDate()}
                  </div>
                  <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{s.title}</div><div style={{ fontSize: 11, color: C.muted }}>{s.duration} · 정원 {s.maxSeats}명</div></div>
                  <button onClick={() => setForm(p => ({ ...p, liveSchedules: p.liveSchedules.filter(x => x.id !== s.id) }))} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 16 }}>x</button>
                </div>
              ))}
              <div style={{ background: isDark ? "rgba(0,0,0,0.06)" : "rgba(0,0,0,0.06)", border: `1px dashed ${ACC}40`, borderRadius: 14, padding: "20px", marginTop: 12 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 14 }}>일정 추가</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                  <div><span style={lbl}>날짜/시간 *</span><input type="datetime-local" value={liveForm.date} onChange={e => setLiveForm(p => ({ ...p, date: e.target.value }))} style={inp} /></div>
                  <div><span style={lbl}>제목 *</span><input value={liveForm.title} onChange={e => setLiveForm(p => ({ ...p, title: e.target.value }))} placeholder="1회차 강의" style={inp} /></div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                  <div><span style={lbl}>소요시간</span><input value={liveForm.duration} onChange={e => setLiveForm(p => ({ ...p, duration: e.target.value }))} placeholder="60분" style={inp} /></div>
                  <div><span style={lbl}>정원</span><input type="number" value={liveForm.maxSeats} onChange={e => setLiveForm(p => ({ ...p, maxSeats: Number(e.target.value) }))} style={inp} /></div>
                </div>
                <button onClick={addLiveSchedule} disabled={!liveForm.date || !liveForm.title}
                  style={{ width: "100%", padding: "13px", borderRadius: 12, border: "none", background: (!liveForm.date || !liveForm.title) ? "rgba(0,0,0,0.06)" : ACC, color: "#fff", fontSize: 14, fontWeight: 800, cursor: (!liveForm.date || !liveForm.title) ? "default" : "pointer" }}>
                  일정 추가
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ 결제 설정 ═══ */}
      {tab === "payment" && (
        <div>
          <div style={section}>
            <div style={sectionTitle}>결제 설정</div>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "16px", borderRadius: 12, border: "1px solid " + C.border, marginBottom: 12, cursor: "pointer" }}>
              <input type="checkbox" checked={form.pricing === "paid"} onChange={e => setForm(p => ({ ...p, pricing: e.target.checked ? "paid" : "free" }))} style={{ marginTop: 2 }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>유료 클래스</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>클래스를 유료로 설정하여 결제 관련 항목을 설정합니다.</div>
              </div>
            </label>
            {form.pricing === "paid" && (
              <div style={{ marginTop: 12 }}>
                <span style={lbl}>수강료 (원)</span>
                <input type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: Number(e.target.value) }))} placeholder="49900" style={inp} />
              </div>
            )}
          </div>
          <div style={section}>
            <div style={sectionTitle}>강의 정보</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div>
                <span style={lbl}>난이도</span>
                <select value={form.difficulty||"입문"} onChange={e => setForm(p => ({ ...p, difficulty: e.target.value }))} style={inp}>
                  <option value="입문">입문</option><option value="초급">초급</option><option value="중급">중급</option><option value="고급">고급</option><option value="입문~중급">입문~중급</option><option value="중급~고급">중급~고급</option>
                </select>
              </div>
              <div>
                <span style={lbl}>수강 기간</span>
                <input value={form.durationInfo||"무제한"} onChange={e => setForm(p => ({ ...p, durationInfo: e.target.value }))} placeholder="무제한" style={inp} />
              </div>
            </div>
          </div>
          <div style={section}>
            <div style={sectionTitle}>공개 범위</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <span style={lbl}>무료 미리보기 수</span>
                <input type="number" value={form.freePreviewCount} onChange={e => setForm(p => ({ ...p, freePreviewCount: Number(e.target.value) }))} style={inp} />
                <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>비회원도 볼 수 있는 강의 수</div>
              </div>
              <div>
                <span style={lbl}>회원 공개 수</span>
                <input type="number" value={form.memberVisibleCount} onChange={e => setForm(p => ({ ...p, memberVisibleCount: Number(e.target.value) }))} style={inp} />
                <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>로그인 회원이 볼 수 있는 강의 수</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ 고급 설정 ═══ */}
      {tab === "settings" && (
        <div>
          {form.type === "vod" && (
            <div style={section}>
              <div style={sectionTitle}>자동 처리 (VOD)</div>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>영상 업로드 시 아래 작업이 자동으로 처리됩니다.</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[
                  ["CC 자막 생성", "Whisper 기반 자동 자막 추출", true],
                  ["다국어 자막 번역", "한/영/일/중/스/베 6개국어", true],
                  ["음성 변환", "국가별 언어로 TTS 변환", true],
                  ["강의 요약 생성", "자막 분석으로 내용 자동 요약", true],
                ].map(([title, desc, enabled]) => (
                  <label key={title} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "14px", borderRadius: 12, border: "1px solid " + C.border, background: C.card, cursor: "pointer" }}>
                    <input type="checkbox" defaultChecked={enabled} style={{ marginTop: 2 }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{title}</div>
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
          <div style={section}>
            <div style={sectionTitle}>기타 설정</div>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "14px", borderRadius: 12, border: "1px solid " + C.border, marginBottom: 8, cursor: "pointer" }}>
              <input type="checkbox" style={{ marginTop: 2 }} />
              <div><div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>게시판 설정</div><div style={{ fontSize: 11, color: C.muted }}>클래스 화면에서 게시판이 노출됩니다</div></div>
            </label>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "14px", borderRadius: 12, border: "1px solid " + C.border, cursor: "pointer" }}>
              <input type="checkbox" style={{ marginTop: 2 }} />
              <div><div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>수강 후기 공개</div><div style={{ fontSize: 11, color: C.muted }}>수강생의 후기를 클래스 페이지에 표시합니다</div></div>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  ClassPage 메인
// ═══════════════════════════════════════════════════════════
export default function ClassPage({ C, navigate, user, theme, initialCourseId, initialLessonId }) {
  const isDark = theme === "dark";
  const [mob, setMob] = useState(() => typeof window !== "undefined" ? window.innerWidth <= 768 : false);
  const [courses, setCourses] = useState([]);
  const [dbLoading, setDbLoading] = useState(true);
  useEffect(() => {
    const onResize = () => setMob(window.innerWidth <= 768);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  useEffect(() => {
    loadAllCourses().then(data => {
      setCourses(data);
      // URL에 courseId가 있으면 해당 클래스 바로 열기
      if (initialCourseId) {
        const course = data.find(c => c.id === initialCourseId);
        if (course) {
          setSelectedCourse(course);
          document.title = `${course.title} - SNS메이킷 클래스`;
          // lessonId도 있으면 해당 강의 선택
          if (initialLessonId && course.lessons) {
            const lesson = course.lessons.find(l => l.id === initialLessonId);
            if (lesson) setSelectedLesson(lesson);
          }
        }
      }
      setDbLoading(false);
    }).catch(() => setDbLoading(false));
  }, []);
  const [filter, setFilter] = useState("all"); // all | vod | zoom | offline
  const [pricingFilter, setPricingFilter] = useState("all"); // all | free | paid
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [showAssignment, setShowAssignment] = useState(null);
  const [completedAssignments, setCompletedAssignments] = useState({}); // { lessonId: true }
  const [selectedDate, setSelectedDate] = useState(null);
  const [subtitleLang, setSubtitleLang] = useState("off");
  const [voiceLang, setVoiceLang] = useState("ko");
  const [subtitles, setSubtitles] = useState({}); // { lessonId: { ko: [{start,end,text}], en: [...] } }
  const [currentSubtitle, setCurrentSubtitle] = useState("");
  const [subLoading, setSubLoading] = useState("");
  const [dubbingAudio, setDubbingAudio] = useState(null);
  const [audioMode, setAudioMode] = useState("original"); // original | subtitle | dubbing
  const [prepareProgress, setPrepareProgress] = useState(""); // 사전 생성 진행 상태
  // 수강 후기
  const [reviews, setReviews] = useState([]);
  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  // 진도율
  const [progress, setProgress] = useState({}); // { lessonId: { watched, assignment_submitted } }
  // Q&A 댓글
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [detailCommentText, setDetailCommentText] = useState("");
  const [lessonNotes, setLessonNotes] = useState({}); // { lessonId: "note text" }
  const [noteSaving, setNoteSaving] = useState(false);
  const noteSaveTimer = useRef(null);
  const STORAGE_BASE = "https://ckzjnpzadeovrasucjmu.supabase.co/storage/v1/object/public/public-assets/classes/";

  // 코스 선택 시 후기/진도/댓글 로드
  useEffect(() => {
    if (!selectedCourse?.id) return;
    supabase.from("class_reviews").select("*").eq("class_id", selectedCourse.id).order("created_at", { ascending: false })
      .then(({ data }) => setReviews(data || []));
    supabase.from("class_comments").select("*").eq("class_id", selectedCourse.id).order("created_at", { ascending: true })
      .then(({ data }) => setComments(data || []));
    if (user?.uid) {
      supabase.from("class_progress").select("*").eq("class_id", selectedCourse.id).eq("uid", user.uid)
        .then(({ data }) => {
          const map = {};
          (data || []).forEach(p => { map[p.lesson_id] = p; });
          setProgress(map);
        });
      // 노트 로드
      supabase.from("class_notes").select("lesson_id, content").eq("class_id", selectedCourse.id).eq("uid", user.uid)
        .then(({ data }) => {
          const map = {};
          (data || []).forEach(n => { map[n.lesson_id] = n.content; });
          setLessonNotes(map);
        });
    }
  }, [selectedCourse?.id, user?.uid]);

  // 레슨 선택 시 DB에서 자막 로드 + 더빙 모드 초기화
  useEffect(() => {
    if (!selectedLesson?.id) return;
    setAudioMode("original");
    setDubbingAudio(null);
    setSubtitleLang("off");
    setVoiceLang("ko");
    if (subtitles[selectedLesson.id]) return;
    supabase.from("class_subtitles").select("lang, subtitles").eq("lesson_id", selectedLesson.id)
      .then(({ data }) => {
        if (data?.length) {
          const langMap = {};
          data.forEach(r => { langMap[r.lang] = r.subtitles; });
          setSubtitles(prev => ({ ...prev, [selectedLesson.id]: langMap }));
        }
      });
  }, [selectedLesson?.id]);

  // 자막 시간 추적
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !selectedLesson) return;
    const subs = subtitles[selectedLesson.id]?.[subtitleLang];
    if (!subs || subtitleLang === "off") { setCurrentSubtitle(""); return; }
    const onTime = () => {
      const t = v.currentTime;
      const cur = subs.find(s => t >= s.start && t <= s.end);
      setCurrentSubtitle(cur?.text || "");
    };
    v.addEventListener("timeupdate", onTime);
    return () => v.removeEventListener("timeupdate", onTime);
  }, [selectedLesson?.id, subtitleLang, subtitles]);

  // 자막 생성 — 실제 음성 Whisper STT
  const generateSubtitles = async (lesson) => {
    if (!lesson) return;
    const videoUrl = lesson.videoSrc;
    if (!videoUrl) {
      setSubLoading("영상 URL이 없습니다"); setTimeout(() => setSubLoading(""), 2000);
      return;
    }
    setSubLoading("음성 분석 중... (Whisper STT)");
    try {
      const res = await fetch("/api/whisper-url", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ video_url: videoUrl, lang: "ko" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubLoading(data.error || "자막 생성 실패"); setTimeout(() => setSubLoading(""), 3000);
        return;
      }
      if (data.subtitles?.length) {
        setSubtitles(prev => ({ ...prev, [lesson.id]: { ...prev[lesson.id], ko: data.subtitles } }));
        supabase.from("class_subtitles").upsert({ lesson_id: lesson.id, lang: "ko", subtitles: data.subtitles }, { onConflict: "lesson_id,lang" }).then(() => {});
        setSubLoading("");
      } else {
        setSubLoading("음성이 감지되지 않았습니다"); setTimeout(() => setSubLoading(""), 2000);
      }
    } catch (e) {
      setSubLoading("자막 생성 실패"); setTimeout(() => setSubLoading(""), 2000);
    }
  };

  // 자막 번역
  const translateSubtitles = async (lesson, targetLang) => {
    if (!lesson || targetLang === "ko" || targetLang === "off") return;
    const koSubs = subtitles[lesson.id]?.ko;
    if (!koSubs) return;
    if (subtitles[lesson.id]?.[targetLang]) return; // 이미 번역됨
    const langNames = { en: "English", ja: "Japanese", zh: "Chinese", es: "Spanish", vi: "Vietnamese" };
    setSubLoading(`${langNames[targetLang] || targetLang} 번역 중...`);
    try {
      const textsStr = koSubs.map(s => s.text).join("\n---\n");
      const res = await fetch("/api/ai-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 2000,
          messages: [{ role: "user", content: `다음 한국어 자막들을 ${langNames[targetLang] || targetLang}로 번역해줘. 각 줄을 ---로 구분해서 같은 순서로 번역 결과만 출력해:\n\n${textsStr}` }],
        }),
      });
      const data = await res.json();
      const translated = (data.content?.[0]?.text || data.choices?.[0]?.message?.content || "").split(/\n---\n|\n-{3}\n/);
      const translatedSubs = koSubs.map((s, i) => ({ ...s, text: translated[i]?.trim() || s.text }));
      setSubtitles(prev => ({
        ...prev,
        [lesson.id]: { ...prev[lesson.id], [targetLang]: translatedSubs },
      }));
      supabase.from("class_subtitles").upsert({ lesson_id: lesson.id, lang: targetLang, subtitles: translatedSubs }, { onConflict: "lesson_id,lang" }).then(() => {});
      setSubLoading("");
    } catch (e) {
      setSubLoading("번역 실패");
      setTimeout(() => setSubLoading(""), 2000);
    }
  };

  // 음성 더빙 로드 (Storage 우선, 없으면 실시간 생성)
  const voiceMap = { ko: "Kore", en: "Puck", ja: "Kore", zh: "Kore", es: "Puck", vi: "Kore" };
  const loadDubbing = async (lesson, targetLang) => {
    if (!lesson || targetLang === "ko") { setDubbingAudio(null); if (videoRef.current) videoRef.current.muted = false; return; }
    // Storage에 미리 생성된 더빙 확인
    const dubUrl = `${STORAGE_BASE}dub_${lesson.id}_${targetLang}.wav`;
    try {
      const check = await fetch(dubUrl, { method: "HEAD" });
      if (check.ok) {
        setDubbingAudio(dubUrl);
        if (videoRef.current) videoRef.current.muted = true;
        return;
      }
    } catch {}
    // 없으면 실시간 생성
    const subs = subtitles[lesson.id]?.[targetLang] || subtitles[lesson.id]?.ko;
    if (!subs) return;
    const langName = LANGS.find(l => l.code === targetLang)?.label || targetLang;
    setSubLoading(`${langName} 음성 생성 중...`);
    try {
      const fullText = subs.map(s => s.text).join(". ");
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: fullText.slice(0, 4000), voice: voiceMap[targetLang] || "Kore" }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        setDubbingAudio(url);
        if (videoRef.current) videoRef.current.muted = true;
      }
      setSubLoading("");
    } catch (e) {
      setSubLoading("음성 생성 실패");
      setTimeout(() => setSubLoading(""), 2000);
    }
  };

  // 언어 + 모드 변경 핸들러
  const switchLang = async (lesson, langCode, mode) => {
    if (!lesson) return;
    if (langCode === "ko") {
      setSubtitleLang("ko"); setVoiceLang("ko"); setDubbingAudio(null); setAudioMode("original");
      if (videoRef.current) { videoRef.current.muted = false; videoRef.current.volume = 1; }
      return;
    }
    setSubtitleLang(langCode);

    if (mode === "dubbing") {
      setAudioMode("dubbing");
      setVoiceLang(langCode);
      // 자막 없으면 로드 시도 (DB에서 이미 로드됐을 수 있음)
      if (!subtitles[lesson.id]?.[langCode]) {
        if (!subtitles[lesson.id]?.ko) await generateSubtitles(lesson);
        await translateSubtitles(lesson, langCode);
      }
      await loadDubbing(lesson, langCode);
    } else {
      // subtitle 모드: 자막만 표시, 원본 음성 유지
      setAudioMode("subtitle");
      setVoiceLang("ko"); setDubbingAudio(null);
      if (videoRef.current) { videoRef.current.muted = false; videoRef.current.volume = 1; }
      if (!subtitles[lesson.id]?.[langCode]) {
        if (!subtitles[lesson.id]?.ko) await generateSubtitles(lesson);
        await translateSubtitles(lesson, langCode);
      }
    }
  };

  // 사전 생성 (관리자용) — 모든 레슨 자막+번역+더빙 생성
  const prepareAllLessons = async (course) => {
    if (!course?.lessons?.length) return;
    const lessons = course.lessons.filter(l => l.videoSrc);
    for (let i = 0; i < lessons.length; i++) {
      const l = lessons[i];
      for (const step of ["stt", "translate", "tts"]) {
        const stepLabel = { stt: "자막 추출", translate: "번역", tts: "더빙 생성" }[step];
        setPrepareProgress(`${i + 1}/${lessons.length} ${l.title} — ${stepLabel}...`);
        try {
          await fetch("/api/prepare-lesson", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lesson_id: l.id, video_url: l.videoSrc, step }),
          });
        } catch {}
      }
    }
    setPrepareProgress("모든 레슨 준비 완료!");
    setTimeout(() => setPrepareProgress(""), 3000);
  };

  // (자막/더빙 전환은 switchLang 함수에서 처리)

  // 플레이어 키보드 단축키
  useEffect(() => {
    const handler = (e) => {
      if (!selectedLesson) return;
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;
      const v = videoRef.current;
      switch (e.key) {
        case " ": e.preventDefault(); if (v) { v.paused ? v.play() : v.pause(); } break;
        case "ArrowLeft": e.preventDefault(); if (v) v.currentTime = Math.max(0, v.currentTime - 10); break;
        case "ArrowRight": e.preventDefault(); if (v) v.currentTime += 10; break;
        case "ArrowUp": e.preventDefault(); if (v) v.volume = Math.min(1, v.volume + 0.1); break;
        case "ArrowDown": e.preventDefault(); if (v) v.volume = Math.max(0, v.volume - 0.1); break;
        case "f": case "F": e.preventDefault(); v?.requestFullscreen?.(); break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedLesson]);
  const [search, setSearch] = useState("");
  const [detailTab, setDetailTab] = useState("intro");
  const [editingCourse, setEditingCourse] = useState(null);
  const [playSpeed, setPlaySpeed] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPlayerControls, setShowPlayerControls] = useState(false);
  const [playerProgress, setPlayerProgress] = useState(0);
  const [playerCurrentTime, setPlayerCurrentTime] = useState(0);
  const [playerDuration, setPlayerDuration] = useState(0);
  const [playerVolume, setPlayerVolume] = useState(1);
  const [playerMuted, setPlayerMuted] = useState(false);
  const hideControlsTimer = useRef(null);
  const videoRef = useRef(null);
  const videoUrlRef = useRef(null);
  useEffect(() => {
    if (selectedLesson?.videoFile instanceof File) {
      videoUrlRef.current = URL.createObjectURL(selectedLesson.videoFile);
      return () => { if (videoUrlRef.current) URL.revokeObjectURL(videoUrlRef.current); };
    } else { videoUrlRef.current = null; }
  }, [selectedLesson?.id]);

  const isAdmin = user?.role === "admin";
  const isInstructor = user?.role === "instructor";
  const canManage = isAdmin || isInstructor;

  // 전체 라이브 일정
  const allLiveSchedules = courses.flatMap(c => (c.liveSchedules||[]).map(s => ({ ...s, courseTitle: c.title, courseId: c.id })));
  const upcomingLive = allLiveSchedules.filter(s => new Date(s.date) > new Date()).sort((a, b) => new Date(a.date) - new Date(b.date));

  // 필터링 + 검색
  const filtered = courses.filter(c => {
    if (filter !== "all" && c.type !== filter) return false;
    if (pricingFilter !== "all" && c.pricing !== pricingFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!c.title.toLowerCase().includes(q) && !c.desc.toLowerCase().includes(q) && !(c.tags||[]).some(t=>t.toLowerCase().includes(q)) && !(c.instructor||"").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  // 로그인 유도 모달
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  // 레슨 잠금 체크 — 비회원도 목록/상세는 볼 수 있되, 시청은 로그인 필요
  const isLessonLocked = (course, lesson, index) => {
    if (lesson.isFreePreview) return false;
    if (!user) return false; // 비회원도 목록에서 잠금 표시 X (클릭 시 로그인 유도)
    if (course.pricing === "free") return false;
    for (let i = 0; i < index; i++) {
      const prev = course.lessons[i];
      if (prev.assignmentRequired && !completedAssignments[prev.id] && !progress[prev.id]?.assignment_submitted) return true;
    }
    return false;
  };

  // 레슨 선택 시 로그인 체크
  const handleSelectLesson = (lesson, locked) => {
    if (locked) return;
    if (!user && !lesson.isFreePreview) {
      setShowLoginPrompt(true);
      return;
    }
    setSelectedLesson(lesson);
    if (selectedCourse) {
      window.history.pushState(null, "", "/class/" + selectedCourse.id + "/" + lesson.id);
      document.title = `${lesson.title} - ${selectedCourse.title} | SNS메이킷 클래스`;
    }
  };

  const handleSaveCourse = async (form) => {
    let course;
    if (form.id && courses.some(c => c.id === form.id)) {
      course = { ...form };
      setCourses(prev => prev.map(c => c.id === form.id ? { ...c, ...form } : c));
      setSelectedCourse({ ...selectedCourse, ...form });
    } else {
      course = { ...form, id: "c_" + Date.now(), instructor: user?.nick || "강사", instructorUid: user?.uid || "", createdAt: new Date().toISOString() };
      setCourses(prev => [course, ...prev]);
    }
    await saveCourseToDb(course);
    // 백그라운드로 자막/번역/더빙 사전 생성
    const videoLessons = (course.lessons || []).filter(l => l.videoSrc);
    if (videoLessons.length) {
      prepareAllLessons(course);
    }
  };

  const handleAssignmentSubmit = (lessonId) => {
    setCompletedAssignments(prev => ({ ...prev, [lessonId]: true }));
    setProgress(prev => ({ ...prev, [lessonId]: { ...prev[lessonId], assignment_submitted: true } }));
  };

  const LANGS = [
    { code: "ko", label: "한국어" }, { code: "en", label: "English" }, { code: "ja", label: "日本語" },
    { code: "zh", label: "中文" }, { code: "es", label: "Español" }, { code: "vi", label: "Tiếng Việt" },
  ];

  // ── 강의 수정 페이지 ──
  if (editingCourse) {
    return <CourseEditorPage course={editingCourse} C={C} isDark={isDark} onClose={() => setEditingCourse(null)} onSave={handleSaveCourse} />;
  }

  // ── 강의 등록 페이지 ──
  if (showEditor) {
    return <CourseEditorPage C={C} isDark={isDark} onClose={() => setShowEditor(false)} onSave={handleSaveCourse} />;
  }

  // ── 플레이어 뷰 (전체화면 영상 + 사이드 커리큘럼) ──
  if (selectedCourse && selectedLesson) {
    const course = selectedCourse;
    const lessons = course.lessons || [];
    const curIdx = lessons.findIndex(l => l.id === selectedLesson.id);
    const prevLesson = curIdx > 0 ? lessons[curIdx - 1] : null;
    const nextLesson = curIdx < lessons.length - 1 ? lessons[curIdx + 1] : null;
    const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];

    const togglePlay = () => { const v = videoRef.current; if (!v) return; v.paused ? v.play() : v.pause(); setIsPlaying(!v.paused); };
    const skip = (sec) => { const v = videoRef.current; if (v) v.currentTime = Math.max(0, v.currentTime + sec); };
    const changeSpeed = () => { const i = speeds.indexOf(playSpeed); const next = speeds[(i + 1) % speeds.length]; setPlaySpeed(next); if (videoRef.current) videoRef.current.playbackRate = next; };
    const hasVideo = !!(selectedLesson.videoSrc || selectedLesson.videoFile);

    // 키보드 단축키는 최상단 useEffect에서 처리

    const ctrlBtn = (onClick, children, title) => (
      <button onClick={onClick} title={title}
        style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 8, padding: "8px 12px", cursor: "pointer", color: "#fff", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 4, backdropFilter: "blur(4px)", fontFamily: "inherit" }}>
        {children}
      </button>
    );

    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 10001, background: "#0a0a1a", display: "flex", flexDirection: "column" }}
        onDragStart={e => e.preventDefault()}>
        {/* 영상 다운로드 차단 CSS */}
        <style>{`
          .class-player video{-webkit-user-select:none;user-select:none;}
          .class-player video::-webkit-media-controls-enclosure{overflow:hidden;}
          .class-player video::-webkit-media-controls-panel{pointer-events:auto;}
          .class-player video::-internal-media-controls-download-button{display:none!important;}
          .class-player video::-webkit-media-controls-current-time-display,.class-player video::-webkit-media-controls-time-remaining-display{pointer-events:none;}
        `}</style>
        {/* 상단 바 */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: mob ? "8px 10px" : "10px 20px", borderBottom: "1px solid rgba(255,255,255,0.1)", flexShrink: 0, background: "#0f0f1a", minHeight: 48 }}>
          <button onClick={() => setSelectedLesson(null)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: mob ? "8px 10px" : "8px 16px", borderRadius: 10, border: "none", background: ACC, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
            돌아가기
          </button>
          <span style={{ fontSize: 14, fontWeight: 800, color: "#fff", flex: 1, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", padding: "0 16px" }}>{course.title}</span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", flexShrink: 0 }}>
            {(() => { const watched = lessons.filter(l => progress[l.id]?.watched).length; return `${watched}/${lessons.length} 완료`; })()}
          </span>
        </div>

        {/* 메인 영역 */}
        <div style={{ flex: 1, display: "flex", flexDirection: mob ? "column" : "row", overflow: "hidden" }}>
          {/* 영상 + 플로팅 컨트롤 */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
            {/* 비디오 영역 */}
            <div className="class-player" style={{ flex: "1 1 0", minHeight: 0, background: "#000", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}
              onMouseEnter={() => setShowPlayerControls(true)}
              onMouseMove={() => {
                setShowPlayerControls(true);
                clearTimeout(hideControlsTimer.current);
                hideControlsTimer.current = setTimeout(() => { if (isPlaying) setShowPlayerControls(false); }, 3000);
              }}
              onMouseLeave={() => setShowPlayerControls(false)}
            >
              {hasVideo ? (<>
                <video ref={videoRef} src={selectedLesson.videoSrc || videoUrlRef.current} style={{ width: "100%", height: "100%", objectFit: "contain", cursor: "pointer" }}
                  onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)}
                  controlsList="nodownload noremoteplayback" disablePictureInPicture
                  onContextMenu={e => e.preventDefault()}
                  onTimeUpdate={() => {
                    const v = videoRef.current; if (!v) return;
                    const pct = (v.currentTime / v.duration) * 100;
                    setPlayerProgress(isFinite(pct) ? pct : 0);
                    setPlayerCurrentTime(v.currentTime);
                    setPlayerDuration(v.duration || 0);
                  }}
                  onEnded={() => {
                    if (user?.uid && selectedCourse?.id) {
                      setProgress(prev => ({ ...prev, [selectedLesson.id]: { ...prev[selectedLesson.id], watched: true } }));
                      supabase.from("class_progress").upsert({ class_id: selectedCourse.id, lesson_id: selectedLesson.id, uid: user.uid, watched: true, updated_at: new Date().toISOString() }, { onConflict: "lesson_id,uid" }).then(() => {});
                    }
                  }} />
                {/* 우클릭/드래그 차단 + 클릭 재생 오버레이 */}
                <div onContextMenu={e => e.preventDefault()} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 }}
                  onClick={togglePlay} />

                {/* 중앙 재생/일시정지 아이콘 (호버 시) */}
                {showPlayerControls && !isPlaying && (
                  <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 5, width: 72, height: 72, borderRadius: "50%", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "opacity .3s, transform .3s" }}
                    onClick={togglePlay}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><polygon points="6 3 20 12 6 21 6 3" fill="#fff" /></svg>
                  </div>
                )}

                {/* ── 플로팅 글래스 컨트롤러 ── */}
                <div style={{
                  position: "absolute", bottom: 16, left: "50%", transform: `translateX(-50%) translateY(${showPlayerControls ? "0" : "20px"})`,
                  opacity: showPlayerControls ? 1 : 0, transition: "all 0.4s cubic-bezier(0.23,1,0.32,1)",
                  zIndex: 10, width: "min(92%, 640px)", pointerEvents: showPlayerControls ? "auto" : "none",
                }}>
                  <div style={{ padding: "14px 18px", background: "rgba(17,17,17,0.6)", backdropFilter: "blur(20px)", borderRadius: 18, border: "1px solid rgba(255,255,255,0.08)" }}>
                    {/* 프로그레스 바 */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", fontVariantNumeric: "tabular-nums", minWidth: 36 }}>
                        {(() => { const m = Math.floor(playerCurrentTime / 60); const s = Math.floor(playerCurrentTime % 60); return `${m}:${s.toString().padStart(2, "0")}`; })()}
                      </span>
                      <div style={{ flex: 1, height: 4, borderRadius: 4, background: "rgba(255,255,255,0.15)", cursor: "pointer", position: "relative" }}
                        onClick={e => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const pct = ((e.clientX - rect.left) / rect.width) * 100;
                          const time = (pct / 100) * (videoRef.current?.duration || 0);
                          if (videoRef.current && isFinite(time)) { videoRef.current.currentTime = time; setPlayerProgress(pct); }
                        }}>
                        <div style={{ position: "absolute", top: 0, left: 0, height: "100%", width: `${playerProgress}%`, borderRadius: 4, background: "#fff", transition: "width 0.1s linear" }} />
                      </div>
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", fontVariantNumeric: "tabular-nums", minWidth: 36 }}>
                        {(() => { const m = Math.floor(playerDuration / 60); const s = Math.floor(playerDuration % 60); return `${m}:${s.toString().padStart(2, "0")}`; })()}
                      </span>
                    </div>
                    {/* 컨트롤 버튼 줄 */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        {/* 이전 강의 */}
                        {prevLesson && !isLessonLocked(course, prevLesson, curIdx - 1) && ctrlBtn(() => setSelectedLesson(prevLesson),
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>, "이전 강의"
                        )}
                        {/* 10초 뒤로 */}
                        {ctrlBtn(() => skip(-10),
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 4v6h6" /><path d="M3.51 15a9 9 0 105.64-8.36L1 10" /></svg>, "10초 뒤로"
                        )}
                        {/* 재생/일시정지 */}
                        {ctrlBtn(togglePlay,
                          isPlaying
                            ? <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
                            : <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><polygon points="6 3 20 12 6 21 6 3" fill="#fff" /></svg>,
                          isPlaying ? "일시정지" : "재생"
                        )}
                        {/* 10초 앞으로 */}
                        {ctrlBtn(() => skip(10),
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M23 4v6h-6" /><path d="M20.49 15a9 9 0 11-5.64-8.36L23 10" /></svg>, "10초 앞으로"
                        )}
                        {/* 다음 강의 */}
                        {nextLesson && !isLessonLocked(course, nextLesson, curIdx + 1) && ctrlBtn(() => setSelectedLesson(nextLesson),
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>, "다음 강의"
                        )}
                        {/* 볼륨 */}
                        <div style={{ display: "flex", alignItems: "center", gap: 2, marginLeft: 4 }}>
                          {ctrlBtn(() => {
                            if (videoRef.current) {
                              const newMuted = !playerMuted;
                              videoRef.current.muted = newMuted;
                              setPlayerMuted(newMuted);
                              if (!newMuted && playerVolume === 0) { setPlayerVolume(1); videoRef.current.volume = 1; }
                            }
                          },
                            playerMuted || playerVolume === 0
                              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
                              : playerVolume > 0.5
                                ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/></svg>
                                : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 010 7.07"/></svg>,
                            "음소거"
                          )}
                          <div style={{ width: 60, height: 4, borderRadius: 4, background: "rgba(255,255,255,0.15)", cursor: "pointer", position: "relative" }}
                            onClick={e => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              const pct = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
                              if (videoRef.current) { videoRef.current.volume = pct; setPlayerVolume(pct); setPlayerMuted(pct === 0); }
                            }}>
                            <div style={{ position: "absolute", top: 0, left: 0, height: "100%", width: `${(playerMuted ? 0 : playerVolume) * 100}%`, borderRadius: 4, background: "#fff" }} />
                          </div>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                        {/* CC 토글 */}
                        <button onClick={() => {
                          if (subtitleLang === "off") {
                            setSubtitleLang("ko");
                            if (!subtitles[selectedLesson.id]?.ko) generateSubtitles(selectedLesson);
                          } else { setSubtitleLang("off"); }
                        }}
                          style={{ padding: "5px 10px", borderRadius: 6, border: subtitleLang !== "off" ? `2px solid ${ACC}` : "1px solid rgba(255,255,255,0.15)", background: subtitleLang !== "off" ? `${ACC}30` : "rgba(255,255,255,0.08)", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                          CC
                        </button>
                        {/* 배속 */}
                        {speeds.map(sp => (
                          <button key={sp} onClick={() => { setPlaySpeed(sp); if (videoRef.current) videoRef.current.playbackRate = sp; }}
                            style={{ padding: "5px 8px", borderRadius: 6, border: "none", background: playSpeed === sp ? "rgba(255,255,255,0.2)" : "transparent", color: "#fff", fontSize: 11, fontWeight: playSpeed === sp ? 800 : 500, cursor: "pointer", fontFamily: "inherit", transition: "background 0.15s" }}>
                            {sp}x
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 자막 오버레이 */}
                {currentSubtitle && subtitleLang !== "off" && (
                  <div style={{ position: "absolute", bottom: showPlayerControls ? 120 : 40, left: "50%", transform: "translateX(-50%)", zIndex: 8, padding: "12px 28px", borderRadius: 10, background: "rgba(0,0,0,0.8)", color: "#fff", fontSize: 22, fontWeight: 700, textAlign: "center", maxWidth: "85%", lineHeight: 1.5, backdropFilter: "blur(6px)", textShadow: "0 1px 4px rgba(0,0,0,0.5)", transition: "bottom 0.3s" }}>
                    {currentSubtitle}
                  </div>
                )}
                {/* 로딩 표시 */}
                {subLoading && (
                  <div style={{ position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)", zIndex: 12, padding: "8px 18px", borderRadius: 10, background: "rgba(0,0,0,0.8)", color: "#fff", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 8, backdropFilter: "blur(4px)" }}>
                    <div style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                    {subLoading}
                  </div>
                )}
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              </>) : (
                <div style={{ textAlign: "center", color: "rgba(255,255,255,0.5)" }}>
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none"><polygon points="5 3 19 12 5 21 5 3" fill="rgba(255,255,255,0.3)" /></svg>
                  <div style={{ marginTop: 12, fontSize: 14 }}>영상이 업로드되지 않았습니다</div>
                </div>
              )}
            </div>

            {/* 하단: 강의 제목 + 언어/모드 선택 */}
            <div style={{ padding: "10px 16px", background: "#0d0d18", borderTop: "1px solid rgba(255,255,255,0.1)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              {/* 왼쪽: 제목 */}
              <div style={{ fontSize: 14, fontWeight: 800, color: "#fff", flexShrink: 0, maxWidth: "30%" }}>#{selectedLesson.order} {selectedLesson.title}</div>
              {/* 가운데: 언어 선택 + 모드 토글 */}
              <div style={{ display: "flex", gap: 4, alignItems: "center", flex: 1, justifyContent: "center", flexWrap: "wrap" }}>
                {LANGS.map(l => {
                  const isActive = subtitleLang === l.code;
                  return (
                    <button key={l.code} onClick={() => switchLang(selectedLesson, l.code, "subtitle")}
                      style={{ padding: "5px 10px", borderRadius: 8, fontSize: 11, fontWeight: isActive ? 800 : 500, cursor: "pointer", fontFamily: "inherit", border: isActive ? `2px solid ${ACC}` : "1px solid rgba(255,255,255,0.1)", background: isActive ? `${ACC}20` : "transparent", color: isActive ? ACC : "rgba(255,255,255,0.4)", transition: "all 0.12s" }}>
                      {l.label}
                    </button>
                  );
                })}
                {subLoading && (
                  <span style={{ fontSize: 10, color: ACC, fontWeight: 600, display: "flex", alignItems: "center", gap: 4, marginLeft: 6 }}>
                    <div style={{ width: 8, height: 8, border: "2px solid " + ACC, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                    {subLoading}
                  </span>
                )}
              </div>
              {/* 오른쪽: 과제 */}
              {selectedLesson.assignmentRequired && !completedAssignments[selectedLesson.id] && (
                <button onClick={() => setShowAssignment(selectedLesson)}
                  style={{ padding: "7px 16px", borderRadius: 8, border: "none", background: GRAD, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
                  과제 제출
                </button>
              )}
            </div>
          </div>

          {/* 사이드 커리큘럼 */}
          <div style={{ width: mob ? "100%" : 300, minWidth: mob ? 0 : 300, maxHeight: mob ? "42vh" : "none", borderLeft: mob ? "none" : "1px solid rgba(255,255,255,0.1)", borderTop: mob ? "1px solid rgba(255,255,255,0.1)" : "none", overflowY: "auto", flexShrink: 0, background: "#111", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", gap: 16, flexShrink: 0 }}>
              {["커리큘럼", "노트", "커뮤니티"].map(t => {
                const tabKey = t === "커리큘럼" ? "curriculum" : t === "노트" ? "notes" : "community";
                const isActive = detailTab === tabKey;
                return (
                  <span key={t} onClick={() => setDetailTab(tabKey)}
                    style={{ fontSize: 14, fontWeight: isActive ? 800 : 500, color: isActive ? ACC : "rgba(255,255,255,0.4)", cursor: "pointer", paddingBottom: 6, borderBottom: isActive ? `2px solid ${ACC}` : "none" }}>{t}</span>
                );
              })}
            </div>
            {detailTab === "notes" ? (
              <div style={{ flex: 1, padding: "16px", display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#e5e7eb" }}>#{selectedLesson.order} {selectedLesson.title}</span>
                  {noteSaving && <span style={{ fontSize: 10, color: ACC }}>저장 중...</span>}
                </div>
                {/* 타임스탬프 삽입 버튼 */}
                <button onClick={() => {
                  const v = videoRef.current;
                  if (!v) return;
                  const m = Math.floor(v.currentTime / 60);
                  const s = Math.floor(v.currentTime % 60);
                  const stamp = `[${m}:${s.toString().padStart(2, "0")}] `;
                  const cur = lessonNotes[selectedLesson.id] || "";
                  const newNote = cur + (cur && !cur.endsWith("\n") ? "\n" : "") + stamp;
                  setLessonNotes(prev => ({ ...prev, [selectedLesson.id]: newNote }));
                }}
                  style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  현재 시간 삽입
                </button>
                <textarea
                  value={lessonNotes[selectedLesson.id] || ""}
                  onChange={e => {
                    const val = e.target.value;
                    setLessonNotes(prev => ({ ...prev, [selectedLesson.id]: val }));
                    // 자동 저장 (1.5초 디바운스)
                    clearTimeout(noteSaveTimer.current);
                    if (user?.uid && selectedCourse?.id) {
                      setNoteSaving(true);
                      noteSaveTimer.current = setTimeout(async () => {
                        await supabase.from("class_notes").upsert(
                          { class_id: selectedCourse.id, lesson_id: selectedLesson.id, uid: user.uid, content: val, updated_at: new Date().toISOString() },
                          { onConflict: "class_id,lesson_id,uid" }
                        );
                        setNoteSaving(false);
                      }, 1500);
                    }
                  }}
                  placeholder="강의를 들으며 메모를 남겨보세요...&#10;&#10;[0:00] 타임스탬프로 중요 포인트를 기록하세요"
                  style={{ flex: 1, width: "100%", padding: "12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#e5e7eb", fontSize: 13, lineHeight: 1.7, outline: "none", fontFamily: "inherit", resize: "none", boxSizing: "border-box" }}
                />
                {!user && <div style={{ textAlign: "center", padding: "20px 0", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>로그인 후 노트를 저장할 수 있습니다</div>}
              </div>
            ) : detailTab === "community" ? (
              <div style={{ flex: 1, padding: "16px", color: "rgba(255,255,255,0.5)", fontSize: 13, display: "flex", flexDirection: "column" }}>
                {user && (
                  <div style={{ marginBottom: 12 }}>
                    <input value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="질문이나 의견을 남겨보세요"
                      style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
                      onKeyDown={async e => {
                        if (e.key === "Enter" && commentText.trim()) {
                          const row = { class_id: course.id, lesson_id: selectedLesson.id, uid: user.uid, nick: user.nick || "익명", role: user.role || "member", content: commentText.trim() };
                          const { data } = await supabase.from("class_comments").insert(row).select().single();
                          if (data) { setComments(prev => [...prev, data]); setCommentText(""); }
                        }
                      }} />
                  </div>
                )}
                <div style={{ flex: 1, overflowY: "auto" }}>
                  {comments.filter(c => c.lesson_id === selectedLesson.id).length === 0 && <div style={{ textAlign: "center", padding: "32px 0", color: "rgba(255,255,255,0.3)" }}>아직 댓글이 없습니다</div>}
                  {comments.filter(c => c.lesson_id === selectedLesson.id).map(c => (
                    <div key={c.id} style={{ padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#e5e7eb" }}>{c.nick}</span>
                        {(c.role === "admin" || c.role === "instructor") && <span style={{ fontSize: 8, fontWeight: 800, padding: "1px 5px", borderRadius: 3, background: c.role === "admin" ? "rgba(251,191,36,0.2)" : "rgba(34,197,94,0.2)", color: c.role === "admin" ? "#fbbf24" : "#22c55e" }}>{c.role === "admin" ? "관리자" : "강사"}</span>}
                        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginLeft: "auto" }}>{new Date(c.created_at).toLocaleDateString("ko-KR")}</span>
                      </div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", lineHeight: 1.5 }}>{c.content}</div>
                      {c.uid === user?.uid && <button onClick={async () => { await supabase.from("class_comments").delete().eq("id", c.id); setComments(prev => prev.filter(x => x.id !== c.id)); }} style={{ marginTop: 3, fontSize: 10, color: "#ef4444", background: "none", border: "none", cursor: "pointer", padding: 0 }}>삭제</button>}
                    </div>
                  ))}
                </div>
              </div>
            ) : lessons.map((l, i) => {
              const locked = isLessonLocked(course, l, i);
              const active = l.id === selectedLesson.id;
              return (
                <div key={l.id} onClick={() => handleSelectLesson(l, locked)}
                  style={{ padding: "12px 14px", cursor: locked ? "default" : "pointer", opacity: locked ? 0.35 : 1, background: active ? `${ACC}18` : "transparent", borderLeft: active ? `3px solid ${ACC}` : "3px solid transparent", transition: "all 0.12s" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {progress[l.id]?.watched && <span style={{ color: "#22c55e", fontSize: 12, flexShrink: 0 }}>&#10003;</span>}
                    <span style={{ fontSize: 13, fontWeight: active ? 800 : 600, color: active ? ACC : "#e5e7eb" }}>#{l.order} {l.title}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 3, display: "flex", gap: 8, alignItems: "center" }}>
                    {l.duration && <span>{l.duration}</span>}
                    {l.assignmentRequired && <span style={{ color: completedAssignments[l.id] || progress[l.id]?.assignment_submitted ? "#22c55e" : "#f59e0b" }}>{completedAssignments[l.id] || progress[l.id]?.assignment_submitted ? "완료" : "과제"}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {showAssignment && <AssignmentModal lesson={showAssignment} C={C} isDark={isDark} onClose={() => setShowAssignment(null)} onSubmit={handleAssignmentSubmit} user={user} classId={selectedCourse?.id} />}
        {showLoginPrompt && (
          <div onClick={() => setShowLoginPrompt(false)} style={{ position: "fixed", inset: 0, zIndex: 99999, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(6px)" }}>
            <div onClick={e => e.stopPropagation()} style={{ background: isDark ? "#1a1a2e" : "#fff", borderRadius: 20, padding: "40px 32px", maxWidth: 380, width: "90%", textAlign: "center", boxShadow: "0 24px 64px rgba(0,0,0,0.3)" }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>&#127891;</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: C.text, marginBottom: 8 }}>로그인이 필요합니다</div>
              <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.7, marginBottom: 24 }}>강의를 시청하려면 로그인해주세요.<br/>회원가입은 무료이며 30초면 완료됩니다.</div>
              <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                <button onClick={() => setShowLoginPrompt(false)} style={{ padding: "12px 24px", borderRadius: 12, border: "1px solid " + (isDark ? "rgba(255,255,255,0.1)" : "#e5e7eb"), background: "transparent", color: C.muted, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>닫기</button>
                <button onClick={() => { setShowLoginPrompt(false); navigate("login"); }} style={{ padding: "12px 28px", borderRadius: 12, border: "none", background: GRAD, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 12px rgba(59,130,246,0.3)" }}>로그인 / 회원가입</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── 강의 상세 페이지 ──
  if (selectedCourse) {
    const course = selectedCourse;
    const lessons = course.lessons || [];
    const schedules = course.liveSchedules || [];
    const totalLessons = lessons.length || schedules.length;
    const watchedCount = lessons.filter(l => progress[l.id]?.watched).length;
    const assignmentCount = lessons.filter(l => l.assignmentRequired).length;
    const assignmentDoneCount = lessons.filter(l => l.assignmentRequired && (completedAssignments[l.id] || progress[l.id]?.assignment_submitted)).length;
    const courseProgressPct = lessons.length ? Math.round((watchedCount / lessons.length) * 100) : 0;
    const nextPlayableLesson = lessons.find((l, i) => !isLessonLocked(course, l, i) && !progress[l.id]?.watched) || lessons.find((l, i) => !isLessonLocked(course, l, i));
    return (
      <div>
        {/* ═══ 히어로 섹션 (다크 배경 + 썸네일) ═══ */}
        <div style={{ background: "linear-gradient(180deg,#0f0c1a 0%,#1a1530 100%)", padding: "90px 20px 40px", position: "relative", overflow: "hidden" }}>
          {/* 배경 블러 이미지 */}
          {course.thumbnail && <div style={{ position: "absolute", inset: 0, background: `url(${course.thumbnail}) center/cover`, filter: "blur(40px) brightness(0.3)", opacity: 0.5 }} />}
          <div style={{ maxWidth: 1060, margin: "0 auto", position: "relative", zIndex: 1 }}>
            <button onClick={() => { setSelectedCourse(null); setSelectedLesson(null); setDetailTab("intro"); window.history.pushState(null, "", "/class"); document.title = "클래스 - SNS메이킷"; }}
              style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: 600, cursor: "pointer", marginBottom: 20, fontFamily: "inherit", backdropFilter: "blur(4px)" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
              목록으로
            </button>
            <div style={{ display: "flex", gap: 28, alignItems: "flex-end", flexWrap: "wrap", flexDirection: mob ? "column" : "row" }}>
              {/* 썸네일 */}
              <div style={{ width: mob ? "100%" : 280, aspectRatio: "16/10", borderRadius: 14, overflow: "hidden", flexShrink: 0, background: "#222", boxShadow: "0 16px 48px rgba(0,0,0,0.4)" }}>
                {course.thumbnail ? <img src={course.thumbnail} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={ACC} strokeWidth="1.5"><polygon points="5 3 19 12 5 21 5 3" /></svg></div>}
              </div>
              {/* 정보 */}
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                  <span style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 800, color: "#fff", background: course.type==="vod"?"rgba(0,0,0,0.06)":course.type==="zoom"?"rgba(236,72,153,0.8)":"rgba(34,197,94,0.8)" }}>
                    {course.type==="vod"?"VOD":course.type==="zoom"?"LIVE":"오프라인"}
                  </span>
                  {course.tags?.slice(0,3).map(t => <span key={t} style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.6)", background: "rgba(255,255,255,0.08)" }}>{t}</span>)}
                </div>
                <h1 style={{ fontSize: "clamp(20px,3vw,28px)", fontWeight: 900, color: "#fff", margin: "0 0 8px", lineHeight: 1.3 }}>{course.title}</h1>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", margin: "0 0 14px", lineHeight: 1.6 }}>{course.desc}</p>
                {/* 강사 */}
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: GRAD, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 15, fontWeight: 900 }}>
                    {(course.instructor||"?")[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{course.instructor}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{totalLessons}개 강의 · {course.pricing==="free"?"무료":"유료"}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ 콘텐츠 + 사이드바 ═══ */}
        <div style={{ maxWidth: 1060, margin: "0 auto", padding: mob ? "20px 16px 80px" : "28px 20px 80px", display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 320px", gap: 28, alignItems: "start" }}>
          {/* 좌측 콘텐츠 */}
          <div>
            {/* 탭 네비 */}
            <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 14, padding: "4px", display: "inline-flex", gap: 4, marginBottom: 24, boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
              {[["intro","클래스 소개"],["curriculum","커리큘럼"],["reviews","수강후기"]].map(([id,label]) => (
                <button key={id} onClick={() => setDetailTab(id)}
                  style={{ padding: mob ? "9px 13px" : "10px 22px", borderRadius: 10, border: "none", background: detailTab===id ? ACC : "transparent", color: detailTab===id ? "#fff" : C.muted, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}>
                  {label}
                </button>
              ))}
            </div>

            {/* 소개 */}
            {detailTab === "intro" && (
              <div>
                {course.introHtml ? (
                  <div style={{ fontSize: 15, lineHeight: 1.9, color: C.text, marginBottom: 32 }} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(course.introHtml) }} />
                ) : (
                  <>
                    <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 16, padding: "24px", marginBottom: 16 }}>
                      <h3 style={{ fontSize: 17, fontWeight: 800, color: C.text, margin: "0 0 10px" }}>클래스 소개</h3>
                      <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.8, margin: 0 }}>{course.desc || "아직 소개가 작성되지 않았습니다."}</p>
                    </div>
                    {course.targetAudience && (
                      <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 16, padding: "24px", marginBottom: 16 }}>
                        <h3 style={{ fontSize: 17, fontWeight: 800, color: C.text, margin: "0 0 10px" }}>이런 분들에게 추천해요</h3>
                        <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.8, margin: 0, whiteSpace: "pre-line" }}>{course.targetAudience}</p>
                      </div>
                    )}
                    {course.process && (
                      <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 16, padding: "24px", marginBottom: 16 }}>
                        <h3 style={{ fontSize: 17, fontWeight: 800, color: C.text, margin: "0 0 10px" }}>클래스 진행 방식</h3>
                        <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.8, margin: 0, whiteSpace: "pre-line" }}>{course.process}</p>
                      </div>
                    )}
                  </>
                )}
                {/* 강사 */}
                <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 16, padding: "24px", marginBottom: 16 }}>
                  <h3 style={{ fontSize: 17, fontWeight: 800, color: C.text, margin: "0 0 14px" }}>강사 소개</h3>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ width: 56, height: 56, borderRadius: "50%", background: GRAD, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 24, fontWeight: 900, flexShrink: 0 }}>
                      {(course.instructor||"?")[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>{course.instructor}</div>
                      {course.instructorBio && <div style={{ fontSize: 13, color: C.muted, marginTop: 4, lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(course.instructorBio) }} />}
                    </div>
                  </div>
                </div>
                {/* Q&A */}
                <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 16, padding: "24px" }}>
                  <h3 style={{ fontSize: 17, fontWeight: 800, color: C.text, margin: "0 0 14px" }}>질문 답변</h3>
                  {user && (
                    <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", background: GRAD, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14, fontWeight: 800, flexShrink: 0 }}>{(user.nick||"?")[0]}</div>
                      <input value={detailCommentText} onChange={e => setDetailCommentText(e.target.value)} placeholder="수업과 관련한 질문을 남겨보세요"
                        style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: "1px solid " + C.border, background: "transparent", color: C.text, fontSize: 13, outline: "none", fontFamily: "inherit" }}
                        onKeyDown={async e => {
                          if (e.key === "Enter" && detailCommentText.trim()) {
                            const row = { class_id: course.id, lesson_id: "", uid: user.uid, nick: user.nick || "익명", role: user.role || "member", content: detailCommentText.trim() };
                            const { data } = await supabase.from("class_comments").insert(row).select().single();
                            if (data) { setComments(prev => [...prev, data]); setDetailCommentText(""); }
                          }
                        }} />
                    </div>
                  )}
                  {comments.filter(c => !c.lesson_id).length === 0 && <div style={{ textAlign: "center", padding: "20px", color: C.muted, fontSize: 13 }}>아직 질문이 없습니다.</div>}
                  {comments.filter(c => !c.lesson_id).map(c => (
                    <div key={c.id} style={{ padding: "12px 0", borderTop: "1px solid " + C.border, display: "flex", gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: c.role === "admin" || c.role === "instructor" ? GRAD : (isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb"), display: "flex", alignItems: "center", justifyContent: "center", color: c.role === "admin" || c.role === "instructor" ? "#fff" : C.muted, fontSize: 12, fontWeight: 800, flexShrink: 0 }}>{(c.nick||"?")[0]}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{c.nick}</span>
                          {(c.role === "admin" || c.role === "instructor") && <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 4, background: c.role === "admin" ? "rgba(251,191,36,0.15)" : "rgba(34,197,94,0.15)", color: c.role === "admin" ? "#fbbf24" : "#22c55e" }}>{c.role === "admin" ? "관리자" : "강사"}</span>}
                          <span style={{ fontSize: 11, color: C.muted, marginLeft: "auto" }}>{new Date(c.created_at).toLocaleDateString("ko-KR")}</span>
                        </div>
                        <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6 }}>{c.content}</div>
                        {c.uid === user?.uid && <button onClick={async () => { await supabase.from("class_comments").delete().eq("id", c.id); setComments(prev => prev.filter(x => x.id !== c.id)); }} style={{ marginTop: 4, fontSize: 11, color: "#ef4444", background: "none", border: "none", cursor: "pointer", padding: 0 }}>삭제</button>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 커리큘럼 */}
            {detailTab === "curriculum" && (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <h3 style={{ fontSize: 17, fontWeight: 800, color: C.text, margin: 0 }}>커리큘럼 · {totalLessons}개 강의</h3>
                </div>
                {lessons.length > 0 ? lessons.map((l, i) => {
                  const locked = isLessonLocked(course, l, i);
                  return (
                    <div key={l.id} onClick={() => handleSelectLesson(l, locked)}
                      style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 18px", borderRadius: 14, border: "1px solid " + C.border, background: C.card, marginBottom: 8, cursor: locked ? "default" : "pointer", opacity: locked ? 0.45 : 1, transition: "all 0.15s" }}
                      onMouseEnter={e => { if (!locked) { e.currentTarget.style.borderColor=ACC; e.currentTarget.style.boxShadow=`0 4px 16px ${ACC}15`; }}}
                      onMouseLeave={e => { e.currentTarget.style.borderColor=C.border; e.currentTarget.style.boxShadow="none"; }}>
                      <div style={{ width: 40, height: 40, borderRadius: 12, background: locked ? (isDark?"rgba(255,255,255,0.06)":"#f0f0f5") : `${ACC}10`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {locked ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                          : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={ACC} strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: locked ? C.muted : C.text }}>{l.title}</div>
                        <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>VOD{l.videoName ? ` · ${l.videoName}` : ""}</div>
                      </div>
                      <div style={{ display: "flex", gap: 4 }}>
                        {l.isFreePreview && <span style={{ padding: "4px 10px", borderRadius: 8, background: "rgba(34,197,94,0.08)", color: "#22c55e", fontSize: 11, fontWeight: 700 }}>무료</span>}
                        {l.assignmentRequired && <span style={{ padding: "4px 10px", borderRadius: 8, background: `${ACC}10`, color: ACC, fontSize: 11, fontWeight: 700 }}>{completedAssignments[l.id] ? "완료" : "과제"}</span>}
                      </div>
                    </div>
                  );
                }) : schedules.map(s => (
                  <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 18px", borderRadius: 14, border: "1px solid " + C.border, background: C.card, marginBottom: 8 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: GRAD, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 900, flexShrink: 0 }}>LIVE</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{s.title}</div>
                      <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>{new Date(s.date).toLocaleString("ko-KR")} · {s.duration}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 수강 후기 */}
            {detailTab === "reviews" && (() => {
              const avgRating = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : "0.0";
              const myReview = reviews.find(r => r.uid === user?.uid);
              const submitReview = async () => {
                if (!user || !reviewText.trim()) return;
                const row = { class_id: course.id, uid: user.uid, nick: user.nick || "익명", rating: reviewRating, content: reviewText.trim() };
                const { data } = await supabase.from("class_reviews").upsert(row, { onConflict: "class_id,uid" }).select().single();
                if (data) { setReviews(prev => [data, ...prev.filter(r => r.uid !== user.uid)]); setReviewText(""); }
              };
              const deleteReview = async (id) => {
                await supabase.from("class_reviews").delete().eq("id", id);
                setReviews(prev => prev.filter(r => r.id !== id));
              };
              return (
                <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 16, padding: "28px" }}>
                  {/* 평균 평점 */}
                  <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
                    <div style={{ fontSize: 42, fontWeight: 900, color: C.text }}>{avgRating}</div>
                    <div>
                      <div style={{ fontSize: 18, color: "#f59e0b", marginBottom: 4 }}>{"★".repeat(Math.round(parseFloat(avgRating)))}{"☆".repeat(5 - Math.round(parseFloat(avgRating)))}</div>
                      <div style={{ fontSize: 13, color: C.muted }}>수강평 {reviews.length}개</div>
                    </div>
                  </div>
                  {/* 후기 작성 */}
                  {user && !myReview && (
                    <div style={{ padding: "18px", borderRadius: 14, border: "1px solid " + C.border, marginBottom: 20, background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)" }}>
                      <div style={{ marginBottom: 10 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginRight: 10 }}>별점</span>
                        {[1,2,3,4,5].map(n => (
                          <span key={n} onClick={() => setReviewRating(n)} style={{ cursor: "pointer", fontSize: 22, color: n <= reviewRating ? "#f59e0b" : C.border }}>{n <= reviewRating ? "★" : "☆"}</span>
                        ))}
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <input value={reviewText} onChange={e => setReviewText(e.target.value)} placeholder="수강 후기를 남겨주세요"
                          style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: "1px solid " + C.border, background: "transparent", color: C.text, fontSize: 13, outline: "none", fontFamily: "inherit" }}
                          onKeyDown={e => e.key === "Enter" && submitReview()} />
                        <button onClick={submitReview} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: GRAD, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>등록</button>
                      </div>
                    </div>
                  )}
                  {/* 후기 목록 */}
                  {reviews.length === 0 && <div style={{ textAlign: "center", padding: "20px", color: C.muted, fontSize: 13 }}>첫 번째 수강 후기를 남겨주세요.</div>}
                  {reviews.map(r => (
                    <div key={r.id} style={{ padding: "14px 0", borderTop: "1px solid " + C.border, display: "flex", gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", background: GRAD, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14, fontWeight: 800, flexShrink: 0 }}>{(r.nick||"?")[0]}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{r.nick}</span>
                          <span style={{ fontSize: 12, color: "#f59e0b" }}>{"★".repeat(r.rating)}</span>
                          <span style={{ fontSize: 11, color: C.muted, marginLeft: "auto" }}>{new Date(r.created_at).toLocaleDateString("ko-KR")}</span>
                        </div>
                        <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6 }}>{r.content}</div>
                        {r.uid === user?.uid && <button onClick={() => deleteReview(r.id)} style={{ marginTop: 6, fontSize: 11, color: "#ef4444", background: "none", border: "none", cursor: "pointer", padding: 0 }}>삭제</button>}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* 우측 사이드바 (sticky) */}
          <div style={{ position: mob ? "static" : "sticky", top: 80 }}>
            <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 16, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.08)" }}>
              {lessons.length > 0 && (
                <div style={{ padding: "18px 20px", borderBottom: "1px solid " + C.border }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: C.text }}>내 수강 진행</span>
                    <span style={{ fontSize: 13, fontWeight: 900, color: ACC }}>{courseProgressPct}%</span>
                  </div>
                  <div style={{ height: 7, borderRadius: 99, background: isDark ? "rgba(255,255,255,0.08)" : "#ececf3", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${courseProgressPct}%`, background: GRAD, borderRadius: 99, transition: "width 0.25s" }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 11, color: C.muted }}>
                    <span>시청 {watchedCount}/{lessons.length}</span>
                    {assignmentCount > 0 && <span>과제 {assignmentDoneCount}/{assignmentCount}</span>}
                  </div>
                </div>
              )}
              {/* 가격 */}
              <div style={{ padding: "20px", borderBottom: "1px solid " + C.border }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: course.pricing==="free" ? "#22c55e" : C.text, marginBottom: 4 }}>
                  {course.pricing === "free" ? "무료" : `${course.price?.toLocaleString()}원`}
                </div>
                {course.pricing === "paid" && <div style={{ fontSize: 12, color: C.muted }}>VAT 포함</div>}
              </div>
              {/* CTA */}
              <div style={{ padding: "16px 20px" }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  <button style={{ flex: 1, padding: "10px", borderRadius: 10, border: "1px solid " + C.border, background: "transparent", color: C.muted, fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
                    찜하기
                  </button>
                  <button style={{ flex: 1, padding: "10px", borderRadius: 10, border: "1px solid " + C.border, background: "transparent", color: C.muted, fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                    공유
                  </button>
                </div>
                {lessons.length > 0 ? (
                  <button onClick={() => { const first = nextPlayableLesson || lessons.find((l,i) => !isLessonLocked(course,l,i)); if (first) setSelectedLesson(first); }}
                    style={{ width: "100%", padding: "15px", borderRadius: 12, border: "none", background: GRAD, color: "#fff", fontSize: 15, fontWeight: 800, cursor: "pointer", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
                    {user ? (watchedCount > 0 ? "이어보기" : "수강 시작하기") : "로그인 후 수강"}
                  </button>
                ) : schedules.length > 0 ? (
                  <button style={{ width: "100%", padding: "15px", borderRadius: 12, border: "none", background: user ? GRAD : "rgba(0,0,0,0.06)", color: "#fff", fontSize: 15, fontWeight: 800, cursor: user?"pointer":"default" }}>
                    {user ? "라이브 신청" : "로그인 필요"}
                  </button>
                ) : null}
              </div>
              {/* 정보 */}
              <div style={{ padding: "0 20px 16px", fontSize: 12, color: C.muted }}>
                {[["강의 수",`${totalLessons}개`],["수강 기간",course.durationInfo||"무제한"],["난이도",course.difficulty||"입문"]].map(([k,v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: "1px solid " + C.border }}>
                    <span>{k}</span><span style={{ fontWeight: 700, color: C.text }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 관리자 */}
            {canManage && (
              <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 12, padding: "14px", marginTop: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: C.muted, marginBottom: 8 }}>관리</div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => setEditingCourse(course)} style={{ flex: 1, padding: "8px", borderRadius: 8, border: "none", background: ACC, color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>수정</button>
                  <button onClick={async () => { if (window.confirm("정말 이 클래스를 삭제할까요?")) { await deleteCourseFromDb(course.id); setCourses(prev => prev.filter(c => c.id !== course.id)); setSelectedCourse(null); }}}
                    style={{ flex: 1, padding: "8px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.3)", background: "transparent", color: "#ef4444", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>삭제</button>
                </div>
                {prepareProgress && (
                  <div style={{ marginTop: 6, fontSize: 10, color: ACC, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                    <div style={{ width: 8, height: 8, border: "2px solid " + ACC, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                    {prepareProgress}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // (수정/등록은 위에서 처리)

  // ── 강의 목록 (메인) ──
  return (
    <div style={{ maxWidth: 1060, margin: "0 auto", padding: mob ? "24px 16px 80px" : "32px 20px 80px" }}>

      {/* 헤더 */}
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ display: "inline-block", background: `${ACC}12`, border: `1px solid ${ACC}25`, borderRadius: 20, padding: "5px 16px", fontSize: 12, fontWeight: 700, marginBottom: 12, color: ACC }}>Class</div>
        <h2 style={{ fontSize: "clamp(22px,4vw,32px)", fontWeight: 900, color: C.text, letterSpacing: -1, marginBottom: 8 }}>
          실전 SNS 마케팅 클래스
        </h2>
        <p style={{ fontSize: 14, color: C.muted }}>VOD 강의부터 실시간 라이브까지, 전문가에게 직접 배우세요</p>
      </div>

      {/* 실시간 방송 일정 + 슬라이드쇼 */}
      <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "320px 1fr", gap: 20, marginBottom: 32, alignItems: "start" }}>
        {/* 왼쪽: 캘린더 */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", animation: "pulse 2s infinite" }} />
            <span style={{ fontSize: 14, fontWeight: 800, color: C.text }}>실시간 방송 일정</span>
          </div>
          <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
          <ClassCalendar schedules={allLiveSchedules} C={C} isDark={isDark} onSelectDate={setSelectedDate} />
        </div>
        {/* 오른쪽: 슬라이드쇼 */}
        <ClassSlideshow courses={courses} C={C} isDark={isDark} onSelect={setSelectedCourse} />
      </div>

      {/* 검색 */}
      <div style={{ marginBottom: 16 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="강의명, 태그, 강사로 검색..."
          style={{ width: "100%", padding: "12px 18px", borderRadius: 14, border: "1px solid " + C.border, background: C.card, color: C.text, fontSize: 14, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
      </div>

      {/* 필터 + 관리자 버튼 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", width: mob ? "100%" : "auto" }}>
          {[["all", "전체"], ["vod", "VOD"], ["zoom", "라이브"], ["offline", "오프라인"]].map(([v, l]) => (
            <button key={v} onClick={() => setFilter(v)}
              style={{ padding: "7px 16px", borderRadius: 10, border: filter === v ? `2px solid ${ACC}` : "1px solid " + C.border, background: filter === v ? `${ACC}10` : "transparent", color: filter === v ? ACC : C.muted, fontSize: 13, fontWeight: 700, cursor: "pointer", flex: mob ? "1 1 auto" : "0 0 auto" }}>
              {l}
            </button>
          ))}
          <div style={{ width: 1, height: 20, background: C.border, margin: "0 4px", alignSelf: "center" }} />
          {[["all", "전체"], ["free", "무료"], ["paid", "유료"]].map(([v, l]) => (
            <button key={v} onClick={() => setPricingFilter(v)}
              style={{ padding: "7px 14px", borderRadius: 10, border: pricingFilter === v ? `2px solid ${ACC}` : "1px solid " + C.border, background: pricingFilter === v ? `${ACC}10` : "transparent", color: pricingFilter === v ? ACC : C.muted, fontSize: 13, fontWeight: 700, cursor: "pointer", flex: mob ? "1 1 auto" : "0 0 auto" }}>
              {l}
            </button>
          ))}
        </div>
        {canManage && (
          <button onClick={() => setShowEditor(true)}
            style={{ padding: "9px 20px", borderRadius: 10, border: "none", background: GRAD, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            + 강의 등록
          </button>
        )}
      </div>

      {/* 강의 카드 그리드 */}
      <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "repeat(auto-fill,minmax(min(280px,100%),1fr))", gap: 16 }}>
        {filtered.map(course => (
          <div key={course.id} onClick={() => { setSelectedCourse(course); window.history.pushState(null, "", "/class/" + course.id); document.title = `${course.title} - SNS메이킷 클래스`; }}
            style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 16, overflow: "hidden", cursor: "pointer", transition: "transform 0.15s, box-shadow 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.06)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}>
            {/* 썸네일 */}
            <div style={{ width: "100%", aspectRatio: "16/9", background: isDark ? `linear-gradient(135deg,#1a1a3a,#0f0f25)` : `linear-gradient(135deg,#f0f0ff,#e8e0ff)`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
              {course.thumbnail ? (
                <img src={course.thumbnail} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={ACC} strokeWidth="1.5" strokeLinecap="round"><polygon points="5 3 19 12 5 21 5 3" /></svg>
              )}
              {/* 뱃지 */}
              <div style={{ position: "absolute", top: 10, left: 10, display: "flex", gap: 4 }}>
                <span style={{ padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 800, color: "#fff", background: course.type === "vod" ? "rgba(17,24,39,0.8)" : course.type === "zoom" ? "rgba(236,72,153,0.85)" : "rgba(34,197,94,0.85)", backdropFilter: "blur(4px)" }}>
                  {course.type === "vod" ? "VOD" : course.type === "zoom" ? "LIVE" : "오프라인"}
                </span>
              </div>
              <div style={{ position: "absolute", top: 10, right: 10 }}>
                <span style={{ padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 800, color: "#fff", background: course.pricing === "free" ? "rgba(34,197,94,0.85)" : "rgba(249,115,22,0.85)", backdropFilter: "blur(4px)" }}>
                  {course.pricing === "free" ? "무료" : `${course.price?.toLocaleString()}원`}
                </span>
              </div>
            </div>
            {/* 정보 */}
            <div style={{ padding: "14px 16px" }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{course.title}</div>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{course.desc}</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, color: C.muted }}>{course.instructor} · {course.type === "vod" ? `${course.lessons.length}개 강의` : `${course.liveSchedules.length}개 일정`}</span>
                <div style={{ display: "flex", gap: 3 }}>
                  {course.tags?.slice(0, 2).map(t => (
                    <span key={t} style={{ padding: "2px 6px", borderRadius: 6, background: isDark ? "rgba(255,255,255,0.06)" : "#f0f0f5", fontSize: 10, color: C.muted }}>{t}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {dbLoading && (
        <div style={{ textAlign: "center", padding: "60px 0", color: C.muted }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>강의 불러오는 중...</div>
        </div>
      )}
      {!dbLoading && filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 20px", color: C.muted }}>
          <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.3 }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.text, marginBottom: 8 }}>클래스 준비 중입니다</div>
          <div style={{ fontSize: 13, lineHeight: 1.7 }}>SNS 마케팅 전문가의 실전 강의가 곧 오픈됩니다.</div>
        </div>
      )}

      {/* 강의 등록 — 별도 페이지 뷰로 처리 (아래 early return) */}
    </div>
  );
}
