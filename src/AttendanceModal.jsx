import { useState, useEffect } from "react";
import { changePoints } from "./storage";

/* ── 출석체크 포인트 구조 ──────────────────────────────
   매일 출석       : +3P
   7일 연속 달성   : +10P 보너스 (총 13P)
   14일 연속 달성  : +20P 보너스 (총 23P)
   30일 연속 달성  : +50P 보너스 (총 53P)
   이달 개근 달성  : +30P 보너스 (월말 자동)
──────────────────────────────────────────────────────── */

const STORAGE_KEY = "nper_attendance_v2";
const today = () => new Date().toISOString().slice(0, 10);
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
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  // 오늘 또는 어제 출석이 없으면 연속 끊김
  if (sorted[0] !== todayStr && sorted[0] !== yesterdayStr) return 0;
  let streak = 0, cur = sorted[0];
  for (const d of sorted) {
    if (d === cur) { streak++; cur = new Date(new Date(cur) - 86400000).toISOString().slice(0, 10); }
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
  const ACC    = "#7c6aff";

  const [data, setData] = useState(null);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState(null); // { pts, bonuses[] }

  useEffect(() => {
    if (user?.uid) setData(loadData(user.uid));
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

  const doCheckIn = async () => {
    if (checkedToday || checking || !user?.uid) return;
    setChecking(true);
    const todayStr = today();
    const newDates = [...(data.dates || []), todayStr];
    const newStreak = calcStreak(newDates);
    const newData = { ...data, dates: newDates, streak: newStreak };

    // 포인트 계산
    let totalPts = 3;
    const bonuses = [];
    const lastBonus = { ...data.lastBonus };

    // 연속 보너스 체크
    const streakBonuses = [
      { days: 7,  pts: 10, label: "7일 연속 출석" },
      { days: 14, pts: 20, label: "14일 연속 출석" },
      { days: 30, pts: 50, label: "30일 연속 출석" },
    ];
    for (const sb of streakBonuses) {
      if (newStreak === sb.days && lastBonus[`streak_${sb.days}`] !== todayStr.slice(0,7)+"-"+newStreak) {
        totalPts += sb.pts;
        bonuses.push(`${sb.label} 보너스 +${sb.pts}P`);
        lastBonus[`streak_${sb.days}`] = todayStr.slice(0,7)+"-"+newStreak;
      }
    }

    // 이달 개근 보너스 (마지막 날에 모든 날짜 출석 시)
    if (todayNum === daysInMonth) {
      const newMonthDates = newDates.filter(d => d.startsWith(thisMonth()));
      if (newMonthDates.length === daysInMonth && lastBonus.month !== thisMonth()) {
        totalPts += 30;
        bonuses.push(`이달 개근 보너스 +30P`);
        lastBonus.month = thisMonth();
      }
    }

    newData.lastBonus = lastBonus;
    saveData(user.uid, newData);
    setData(newData);

    try {
      const newPts = await changePoints(user.uid, totalPts,
        `출석체크 +3P${bonuses.length ? ` + 보너스 ${bonuses.join(", ")}` : ""}`);
      if (onUserUpdate) onUserUpdate({ ...user, points: newPts });
      setResult({ pts: totalPts, bonuses });
    } catch {}
    setChecking(false);
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
              { days: 7,  pts: 10, label: "7일 연속" },
              { days: 14, pts: 20, label: "14일 연속" },
              { days: 30, pts: 50, label: "30일 연속" },
            ].map(({ days, pts, label }) => {
              const reached = streak >= days;
              const pct = Math.min((streak / days) * 100, 100);
              return (
                <div key={days} style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ fontSize: 11, color: reached ? ACC : text, fontWeight: reached ? 800 : 500 }}>
                      {reached ? "✓ " : ""}{label}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 800, color: ACC }}>+{pts}P 보너스</span>
                  </div>
                  <div style={{ height: 5, borderRadius: 3, background: D ? "rgba(255,255,255,0.08)" : "#e5e5f0", overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: 3, background: `linear-gradient(90deg,${ACC},#8b5cf6)`, width: `${pct}%`, transition: "width 0.5s" }} />
                  </div>
                  {!reached && <div style={{ fontSize: 10, color: muted, marginTop: 2 }}>{streak}/{days}일 ({days-streak}일 남음)</div>}
                </div>
              );
            })}
            <div style={{ marginTop: 8, padding: "8px 10px", borderRadius: 8, background: D ? "rgba(255,255,255,0.04)" : "#f0f0f8", fontSize: 11, color: muted }}>
              📅 이달 개근 달성 시 <b style={{ color: ACC }}>+30P 보너스</b> ({daysInMonth - monthDates.length}일 남음)
            </div>
          </div>

          {/* 결과 표시 */}
          {result && (
            <div style={{ marginBottom: 14, padding: "14px 16px", borderRadius: 12,
              background: "linear-gradient(135deg,rgba(99,102,241,0.15),rgba(139,92,246,0.1))",
              border: `1px solid ${ACC}40`, textAlign: "center" }}>
              <div style={{ fontSize: 26, fontWeight: 900, color: ACC, marginBottom: 4 }}>+{result.pts}P 지급!</div>
              {result.bonuses.map((b, i) => (
                <div key={i} style={{ fontSize: 12, color: "#a5b4fc", fontWeight: 700 }}>🎉 {b}</div>
              ))}
            </div>
          )}

          {/* 출석 버튼 */}
          {checkedToday ? (
            <div style={{ padding: "14px", borderRadius: 14, background: `${ACC}12`, border: `1px solid ${ACC}30`,
              textAlign: "center", fontSize: 14, fontWeight: 800, color: ACC }}>
              오늘 출석 완료! (+3P)
            </div>
          ) : (
            <button onClick={doCheckIn} disabled={checking}
              style={{ width: "100%", padding: "15px", borderRadius: 14, border: "none",
                cursor: checking ? "wait" : "pointer",
                background: `linear-gradient(135deg,${ACC},#8b5cf6)`,
                color: "#fff", fontSize: 15, fontWeight: 900,
                boxShadow: `0 6px 20px ${ACC}40`,
                opacity: checking ? 0.7 : 1 }}>
              {checking ? "처리 중..." : "🔴 출석체크 (+3P)"}
            </button>
          )}

          <div style={{ textAlign: "center", fontSize: 11, color: muted, marginTop: 10 }}>
            매일 출석 +3P · 7일 연속 +10P · 14일 +20P · 30일 +50P · 이달 개근 +30P
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
