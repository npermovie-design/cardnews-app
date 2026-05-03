import { useState, useEffect, useRef } from "react";
import { addAttendance, changePoints, fetchAttendance, usesToPoints } from "./storage";

/* ── 출석체크 이용 횟수 구조 (강화) ─────────────────────
   매일 출석         : 3일 연속부터 +1회 (1~2일은 0회)
   5일 연속 달성     : +1회 보너스
   10일 연속 달성    : +2회 보너스
   20일 연속 달성    : +5회 보너스
   30일 연속 달성    : +10회 보너스
   이달 개근 달성    : +5회 보너스 (월말 자동)
──────────────────────────────────────────────────────── */

const STORAGE_KEY = "nper_attendance_v2";
const dateKey = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const today = () => dateKey();
const thisMonth = () => today().slice(0, 7);

function loadData(uid) {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return all[uid] || { dates: [], streak: 0, lastBonus: {} };
  } catch { return { dates: [], streak: 0, lastBonus: {} }; }
}
function saveData(uid, data) {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    all[uid] = data;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {}
}
function calcStreak(dates) {
  if (!dates.length) return 0;
  const sorted = [...dates].sort().reverse();
  const todayStr = today();
  const yesterdayStr = dateKey(new Date(Date.now() - 86400000));
  // 오늘 또는 어제 출석이 없으면 연속 끊김
  if (sorted[0] !== todayStr && sorted[0] !== yesterdayStr) return 0;
  let streak = 0, cur = sorted[0];
  for (const d of sorted) {
    if (d === cur) { streak++; cur = dateKey(new Date(new Date(cur).getTime() - 86400000)); }
    else break;
  }
  return streak;
}

export default function AttendanceModal({ user, onClose, onUserUpdate, isDark }) {
  const D = isDark;
  const bg     = D ? "#16162a" : "#fff";
  const text   = D ? "#fff"    : "#1a1a2e";
  const muted  = D ? "rgba(255,255,255,0.5)" : "#888";
  const bdr    = D ? "rgba(255,255,255,0.1)" : "#e9ecef";
  const card   = D ? "rgba(255,255,255,0.05)" : "#f8f8f8";
  const ACC    = "#168EEA";

  const [data, setData] = useState(null);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState(null); // { uses, bonuses[] }
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    let alive = true;
    (async () => {
      const remoteDates = await fetchAttendance(user.uid);
      if (!alive) return;
      if (remoteDates) {
        const local = loadData(user.uid);
        const mergedDates = [...new Set([...(local.dates || []), ...remoteDates])].sort();
        const merged = { ...local, dates: mergedDates, streak: calcStreak(mergedDates) };
        saveData(user.uid, merged);
        setData(merged);
        setDbReady(true);
      } else {
        setData(loadData(user.uid));
        setDbReady(false);
      }
    })();
    return () => { alive = false; };
  }, [user?.uid]);

  const checkedToday = data?.dates?.includes(today());
  const streak = data ? calcStreak(data.dates) : 0;

  // 이번달 출석 날짜
  const monthDates = (data?.dates || []).filter(d => d.startsWith(thisMonth()));

  // 이번달 달력
  const now = new Date();
  const year = now.getFullYear(), month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay(); // 0=일
  const todayNum = now.getDate();

  const checkingRef = useRef(false);
  const doCheckIn = async () => {
    if (checkedToday || checking || checkingRef.current || !user?.uid) return;
    checkingRef.current = true;
    setChecking(true);
    const todayStr = today();
    const newDates = [...(data.dates || []), todayStr];
    const newStreak = calcStreak(newDates);
    const newData = { ...data, dates: newDates, streak: newStreak };

    // 이용 횟수 계산 (강화: 3일 연속부터 +1회, 그 전은 출석만 기록)
    let totalUses = newStreak >= 3 ? 1 : 0;
    const bonuses = [];
    const lastBonus = { ...data.lastBonus };

    if (newStreak < 3) {
      bonuses.push(`연속 ${newStreak}일째 (3일부터 적립 시작)`);
    }

    // 연속 보너스 체크 (조건 강화)
    const streakBonuses = [
      { days: 5,  uses: 1, label: "5일 연속 출석" },
      { days: 10, uses: 2, label: "10일 연속 출석" },
      { days: 20, uses: 5, label: "20일 연속 출석" },
      { days: 30, uses: 10, label: "30일 연속 출석" },
    ];
    for (const sb of streakBonuses) {
      if (newStreak === sb.days && lastBonus[`streak_${sb.days}`] !== todayStr.slice(0,7)+"-"+newStreak) {
        totalUses += sb.uses;
        bonuses.push(`${sb.label} 보너스 +${sb.uses}회`);
        lastBonus[`streak_${sb.days}`] = todayStr.slice(0,7)+"-"+newStreak;
      }
    }

    // 이달 개근 보너스 (마지막 날에 모든 날짜 출석 시)
    if (todayNum === daysInMonth) {
      const newMonthDates = newDates.filter(d => d.startsWith(thisMonth()));
      if (newMonthDates.length === daysInMonth && lastBonus.month !== thisMonth()) {
        totalUses += 5;
        bonuses.push(`이달 개근 보너스 +5회`);
        lastBonus.month = thisMonth();
      }
    }

    try {
      const totalPts = usesToPoints(totalUses);
      const reason = `출석체크 +1회${bonuses.length ? ` + 보너스 ${bonuses.join(", ")}` : ""}`;
      let newPts;
      if (dbReady) {
        const r = await addAttendance(user.uid, todayStr, totalPts, reason);
        if (r.duplicate) {
          const remoteDates = await fetchAttendance(user.uid);
          const synced = { ...data, dates: remoteDates || data.dates, streak: calcStreak(remoteDates || data.dates) };
          saveData(user.uid, synced);
          setData(synced);
          setResult({ uses: 0, bonuses: ["이미 오늘 출석 처리됨"] });
          setChecking(false);
          checkingRef.current = false;
          return;
        }
        if (!r.ok) throw new Error("attendance db failed");
        newPts = r.points;
      } else {
        newPts = await changePoints(user.uid, totalPts, reason);
      }
      newData.lastBonus = lastBonus;
      saveData(user.uid, newData);
      setData(newData);
      if (onUserUpdate) onUserUpdate({ ...user, points: newPts });
      setResult({ uses: totalUses, bonuses });
    } catch {}
    setChecking(false);
    checkingRef.current = false;
  };

  if (!data) return null;

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 9999, padding: 16,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: bg, borderRadius: 20, width: "100%", maxWidth: 460,
        boxShadow: "0 24px 64px rgba(0,0,0,0.4)", overflow: "hidden",
      }}>
        {/* 헤더 */}
        <div style={{
          padding: "22px 24px 16px",
          background: `linear-gradient(135deg,${ACC}22,${ACC}08)`,
          borderBottom: `1px solid ${bdr}`,
          textAlign: "center",
        }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: ACC, letterSpacing: 2, marginBottom: 8 }}>
            출석체크
          </div>
          <div style={{ fontSize: 20, fontWeight: 900, color: text, marginBottom: 4 }}>
            {now.getFullYear()}년 {now.getMonth() + 1}월
          </div>
          <div style={{ fontSize: 12, color: muted }}>
            이번달 출석 <b style={{ color: ACC }}>{monthDates.length}일</b> / {daysInMonth}일
          </div>
        </div>

        <div style={{ padding: "16px 20px 20px", overflowY: "auto", maxHeight: "70vh" }}>

          {/* 연속 출석 뱃지 */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16, justifyContent: "center" }}>
            <div style={{ padding: "8px 18px", borderRadius: 20, background: `${ACC}18`, border: `1px solid ${ACC}40`, textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: ACC }}>{streak}일</div>
              <div style={{ fontSize: 10, color: muted }}>연속 출석</div>
            </div>
            <div style={{ padding: "8px 18px", borderRadius: 20, background: card, border: `1px solid ${bdr}`, textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: text }}>{monthDates.length}일</div>
              <div style={{ fontSize: 10, color: muted }}>이번달 출석</div>
            </div>
          </div>

          {/* 달력 */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 4 }}>
              {["일","월","화","수","목","금","토"].map(d => (
                <div key={d} style={{ textAlign: "center", fontSize: 10, fontWeight: 700, color: muted, padding: "4px 0" }}>{d}</div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3 }}>
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateStr = `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
                const attended = data.dates.includes(dateStr);
                const isToday = day === todayNum;
                const isFuture = day > todayNum;
                return (
                  <div key={day} style={{
                    aspectRatio: "1",
                    borderRadius: 8,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexDirection: "column", gap: 1,
                    background: attended ? `${ACC}20` : isToday ? `${ACC}08` : "transparent",
                    border: isToday ? `1.5px solid ${ACC}` : `1px solid ${attended ? `${ACC}30` : bdr}`,
                    opacity: isFuture ? 0.35 : 1,
                    position: "relative",
                  }}>
                    <div style={{ fontSize: 11, fontWeight: isToday ? 800 : 500, color: attended ? ACC : text }}>{day}</div>
                    {attended && <div style={{ fontSize: 13, lineHeight: 1 }}>🔴</div>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 보너스 마일스톤 */}
          <div style={{ marginBottom: 16, padding: "12px 14px", borderRadius: 12, background: card, border: `1px solid ${bdr}` }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: text, marginBottom: 10 }}>🎯 연속 출석 보너스</div>
            {[
              { days: 5,  uses: 1, label: "5일 연속" },
              { days: 10, uses: 2, label: "10일 연속" },
              { days: 20, uses: 5, label: "20일 연속" },
              { days: 30, uses: 10, label: "30일 연속" },
            ].map(({ days, uses, label }) => {
              const reached = streak >= days;
              const pct = Math.min((streak / days) * 100, 100);
              return (
                <div key={days} style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ fontSize: 11, color: reached ? ACC : text, fontWeight: reached ? 800 : 500 }}>
                      {reached ? "✓ " : ""}{label}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 800, color: ACC }}>+{uses}회 보너스</span>
                  </div>
                  <div style={{ height: 5, borderRadius: 3, background: D ? "rgba(255,255,255,0.08)" : "#e5e5f0", overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: 3, background: `linear-gradient(90deg,${ACC},#8b5cf6)`, width: `${pct}%`, transition: "width 0.5s" }} />
                  </div>
                  {!reached && <div style={{ fontSize: 10, color: muted, marginTop: 2 }}>{streak}/{days}일 ({days-streak}일 남음)</div>}
                </div>
              );
            })}
            <div style={{ marginTop: 8, padding: "8px 10px", borderRadius: 8, background: D ? "rgba(255,255,255,0.04)" : "#f0f0f8", fontSize: 11, color: muted }}>
              이달 개근 달성 시 <b style={{ color: ACC }}>+5회 보너스</b> ({daysInMonth - monthDates.length}일 남음)
            </div>
          </div>

          {/* 결과 표시 */}
          {result && (
            <div style={{ marginBottom: 14, padding: "14px 16px", borderRadius: 12,
              background: "linear-gradient(135deg,rgba(0,0,0,0.06),rgba(139,92,246,0.1))",
              border: `1px solid ${ACC}40`, textAlign: "center" }}>
              <div style={{ fontSize: 26, fontWeight: 900, color: ACC, marginBottom: 4 }}>+{result.uses}회 적립!</div>
              {result.bonuses.map((b, i) => (
                <div key={i} style={{ fontSize: 12, color: "#a5b4fc", fontWeight: 700 }}>🎉 {b}</div>
              ))}
            </div>
          )}

          {/* 출석 버튼 */}
          {checkedToday ? (
            <div style={{ padding: "14px", borderRadius: 14, background: `${ACC}12`, border: `1px solid ${ACC}30`,
              textAlign: "center", fontSize: 14, fontWeight: 800, color: ACC }}>
              오늘 출석 완료! (+1회 적립)
            </div>
          ) : (
            <button onClick={doCheckIn} disabled={checking}
              style={{ width: "100%", padding: "15px", borderRadius: 14, border: "none",
                cursor: checking ? "wait" : "pointer",
                background: `linear-gradient(135deg,${ACC},#8b5cf6)`,
                color: "#fff", fontSize: 15, fontWeight: 900,
                boxShadow: `0 6px 20px ${ACC}40`,
                opacity: checking ? 0.7 : 1 }}>
              {checking ? "처리 중..." : "🔴 출석체크 (+1회)"}
            </button>
          )}

          <div style={{ textAlign: "center", fontSize: 11, color: muted, marginTop: 10 }}>
            3일 연속부터 +1회 · 5일 +1 · 10일 +2 · 20일 +5 · 30일 +10 · 개근 +5
          </div>
        </div>

        {/* 닫기 */}
        <div style={{ padding: "10px 20px", borderTop: `1px solid ${bdr}`, display: "flex", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "8px 20px", borderRadius: 10, border: `1px solid ${bdr}`,
            background: "transparent", color: muted, fontSize: 13, cursor: "pointer" }}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
