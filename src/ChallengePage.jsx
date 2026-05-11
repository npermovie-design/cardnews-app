import React, { useState, useEffect, useRef } from "react";
import { supabase, uploadFileToStorage } from "./storage";
import { RichEditor } from "./BoardComponents.jsx";
import DOMPurify from "dompurify";

/* ── 상수 / 헬퍼 ──────────────────────────────────────── */
const PRIMARY = "#3b82f6";
// extra_link: 단일 URL(레거시) 또는 JSON 배열 호환
// extra_link: 단일URL(레거시), URL배열, 또는 객체배열 [{img,cat,link}] 호환
const getExtraLinks = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { const arr = JSON.parse(val); if (Array.isArray(arr)) return arr; } catch {}
  return [val];
};
const extraImg = (item) => typeof item === "string" ? item : item?.img || item;
const extraCat = (item) => typeof item === "object" ? item?.cat : null;
const extraUrl = (item) => typeof item === "object" ? item?.link : null;
const hasExtra = (m) => m && getExtraLinks(m.extra_link).length > 0;

function RunnerChar({ nick, color, running, size = 40 }) {
  const c = color;
  const ini = (nick || "?")[0];
  const sc = size / 40; // scale
  return (
    <svg width={size} height={size * 1.25} viewBox="0 0 40 50">
      {running ? (<>
        {/* 뒷다리 — 뒤로 대각선 뻗음 + 발 */}
        <line x1="18" y1="32" x2="28" y2="42" stroke={c} strokeWidth="4" strokeLinecap="round" />
        <line x1="28" y1="42" x2="32" y2="41" stroke={c} strokeWidth="3" strokeLinecap="round" />
        {/* 앞다리 — 무릎 높이 올림 + 종아리 아래로 */}
        <line x1="18" y1="32" x2="12" y2="26" stroke={c} strokeWidth="4" strokeLinecap="round" />
        <line x1="12" y1="26" x2="12" y2="36" stroke={c} strokeWidth="3.5" strokeLinecap="round" />
        <line x1="12" y1="36" x2="9" y2="36" stroke={c} strokeWidth="3" strokeLinecap="round" />
        {/* 몸통 — 살짝 앞으로 */}
        <line x1="21" y1="20" x2="18" y2="33" stroke={c} strokeWidth="5" strokeLinecap="round" />
        {/* 뒷팔 — 뒤로 뻗음 */}
        <line x1="20" y1="23" x2="28" y2="20" stroke={c} strokeWidth="3.5" strokeLinecap="round" />
        {/* 앞팔 — 앞으로 접어 올림 */}
        <line x1="20" y1="23" x2="15" y2="20" stroke={c} strokeWidth="3.5" strokeLinecap="round" />
        <line x1="15" y1="20" x2="16" y2="15" stroke={c} strokeWidth="3" strokeLinecap="round" />
        {/* 머리 */}
        <circle cx="23" cy="11" r="10" fill={c} stroke="#fff" strokeWidth="2" />
        <text x="23" y="15" textAnchor="middle" fontSize="10" fontWeight="800" fill="#fff">{ini}</text>
      </>) : (<>
        {/* 서있는 자세 */}
        <line x1="20" y1="32" x2="16" y2="46" stroke={c} strokeWidth="4" strokeLinecap="round" />
        <line x1="16" y1="46" x2="13" y2="46" stroke={c} strokeWidth="3" strokeLinecap="round" />
        <line x1="20" y1="32" x2="24" y2="46" stroke={c} strokeWidth="4" strokeLinecap="round" />
        <line x1="24" y1="46" x2="27" y2="46" stroke={c} strokeWidth="3" strokeLinecap="round" />
        <line x1="20" y1="20" x2="20" y2="33" stroke={c} strokeWidth="5" strokeLinecap="round" />
        <line x1="20" y1="24" x2="13" y2="29" stroke={c} strokeWidth="3.5" strokeLinecap="round" />
        <line x1="20" y1="24" x2="27" y2="29" stroke={c} strokeWidth="3.5" strokeLinecap="round" />
        <circle cx="20" cy="11" r="10" fill={c} stroke="#fff" strokeWidth="2" />
        <text x="20" y="15" textAnchor="middle" fontSize="10" fontWeight="800" fill="#fff">{ini}</text>
      </>)}
    </svg>
  );
}
const maskNick = (nick) => { const n = nick || "?"; return n.length <= 2 ? n[0] + "*" : n.slice(0, 2) + "*".repeat(Math.max(1, n.length - 2)); };
const fmt = d => d ? new Date(d).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" }) : "";
const dday = d => { if (!d) return ""; const diff = Math.ceil((new Date(d) - new Date()) / 86400000); return diff > 0 ? `D-${diff}` : diff === 0 ? "D-DAY" : "마감"; };
const STATUS_MAP = {
  recruiting: { label: "모집중", color: "#22c55e", bg: "rgba(34,197,94,0.1)" },
  ongoing:    { label: "진행중", color: PRIMARY,   bg: "rgba(59,130,246,0.1)" },
  completed:  { label: "완료",   color: "#6b7280", bg: "rgba(107,114,128,0.1)" },
};
const TYPE_MAP = {
  challenge: { label: "성장 프로그램", color: "#3b82f6", bg: "rgba(59,130,246,0.1)" },
  class:     { label: "클래스",   color: "#10b981", bg: "rgba(16,185,129,0.1)" },
  meetup:    { label: "모임",     color: "#8b5cf6", bg: "rgba(139,92,246,0.1)" },
  study:     { label: "스터디",   color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
};
const PURPOSE_OPTIONS = ["SNS 수익화", "꾸준한 습관 만들기", "브랜딩 / 퍼스널브랜드", "마케팅 실력 향상", "기타"];

/* ── Supabase CRUD ─────────────────────────────────────── */
async function loadChallenges() { const { data } = await supabase.from("challenges").select("*").order("created_at", { ascending: false }); return data || []; }
async function loadChallenge(id) { const { data } = await supabase.from("challenges").select("*").eq("id", id).single(); return data; }
async function saveChallenge(c) {
  const row = { ...c, updated_at: new Date().toISOString() };
  if (!row.id) { row.id = "ch_" + Date.now(); row.created_at = new Date().toISOString(); }
  await supabase.from("challenges").upsert(row, { onConflict: "id" }); return row;
}
async function deleteChallenge(id) { await supabase.from("challenges").delete().eq("id", id); }
async function loadApplications(cid) { const { data } = await supabase.from("challenge_applications").select("*").eq("challenge_id", cid).order("created_at", { ascending: false }); return data || []; }
async function loadMyApplication(cid, uid) { if (!uid) return null; const { data } = await supabase.from("challenge_applications").select("*").eq("challenge_id", cid).eq("uid", uid).maybeSingle(); return data || null; }
async function submitApplication(app) { const row = { ...app, id: "ca_" + Date.now(), status: "pending", created_at: new Date().toISOString() }; const { error } = await supabase.from("challenge_applications").insert(row); if (error) throw new Error(error.message || "신청 저장 실패"); return row; }
async function updateApplicationStatus(id, status) { await supabase.from("challenge_applications").update({ status }).eq("id", id); }
async function updateApplicationProof(id, patch) { const { data, error } = await supabase.from("challenge_applications").update(patch).eq("id", id).select("*").single(); if (error) throw new Error(error.message || "인증 저장 실패"); return data; }
async function loadPublicApplicants(cid) {
  const { data, error } = await supabase.rpc("get_challenge_participants", { p_challenge_id: cid });
  if (!error) return data || [];
  const { data: fb } = await supabase.from("challenge_applications").select("id,name,status,created_at").eq("challenge_id", cid).order("created_at", { ascending: true });
  return fb || [];
}
async function loadMissions(cid) { const { data } = await supabase.from("challenge_missions").select("*").eq("challenge_id", cid).order("created_at", { ascending: false }); return data || []; }
async function submitMission(m) { const row = { ...m, id: "cm_" + Date.now(), created_at: new Date().toISOString() }; await supabase.from("challenge_missions").insert(row); return row; }
async function updateMission(id, patch) { const { data, error } = await supabase.from("challenge_missions").update(patch).eq("id", id).select("*").single(); if (error) throw new Error(error.message || "인증 수정 실패"); return data; }
async function uploadChallengeProof(challengeId, user, file, kind) {
  const ext = file.name.split(".").pop() || "png";
  const safeUid = user?.uid || "guest";
  const path = `challenge-proofs/${challengeId}/${kind}_${safeUid}_${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("uploads").upload(path, file, { contentType: file.type, upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from("uploads").getPublicUrl(path);
  return data?.publicUrl || "";
}

/* ═══════════════════════════════════════════════════════════
   ChallengePage
   ═══════════════════════════════════════════════════════════ */
export default function ChallengePage({ C, navigate, user, theme, onLoginRequest, initialChallengeId }) {
  const isDark = theme === "dark";
  const bdr = C.border;
  const card = C.card || (isDark ? "rgba(255,255,255,0.03)" : "#fff");
  const isAdmin = user?.role === "admin";
  const [mob, setMob] = useState(typeof window !== "undefined" && window.innerWidth < 768);
  useEffect(() => { const h = () => setMob(window.innerWidth < 768); window.addEventListener("resize", h); return () => window.removeEventListener("resize", h); }, []);

  const [view, setView] = useState(initialChallengeId ? "loading_detail" : "list");
  const [challenges, setChallenges] = useState([]);
  const [sel, setSel] = useState(null);
  const [myApp, setMyApp] = useState(null);
  const [apps, setApps] = useState([]);
  const [missions, setMissions] = useState([]);
  const [publicApps, setPublicApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const showToast = msg => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  // SEO 메타 업데이트
  const updateSeo = (ch) => {
    if (!ch) return;
    const title = `${ch.title} - SNS메이킷 성장 프로그램`;
    const desc = (ch.subtitle || ch.description?.replace(/<[^>]*>/g, "") || "").slice(0, 155);
    const url = `https://snsmakeit.com/growth/${ch.id}`;
    document.title = title;
    const setM = (sel, val) => { const el = document.querySelector(sel); if (el && val) el.content = val; };
    setM('meta[name="description"]', desc);
    setM('meta[property="og:title"]', title);
    setM('meta[property="og:description"]', desc);
    setM('meta[property="og:url"]', url);
    setM('meta[property="og:type"]', "website");
    setM('meta[name="twitter:title"]', title);
    setM('meta[name="twitter:description"]', desc);
    if (ch.thumbnail) { setM('meta[property="og:image"]', ch.thumbnail); setM('meta[name="twitter:image"]', ch.thumbnail); }
    let canon = document.querySelector('link[rel="canonical"]');
    if (!canon) { canon = document.createElement("link"); canon.rel = "canonical"; document.head.appendChild(canon); }
    canon.href = url;
  };
  const resetSeo = () => { document.title = "성장 프로그램 - SNS메이킷"; };

  useEffect(() => {
    (async () => {
      try {
        let data = await loadChallenges();
        // 실제 신청자 수로 application_count 동기화
        try {
          const ids = data.map(c => c.id);
          const { data: counts } = await supabase.from("challenge_applications").select("challenge_id").in("challenge_id", ids);
          if (counts) {
            const countMap = {};
            counts.forEach(r => { countMap[r.challenge_id] = (countMap[r.challenge_id] || 0) + 1; });
            data = data.map(c => ({ ...c, application_count: countMap[c.id] || 0 }));
          }
        } catch {}
        setChallenges(data);
        // URL에 challengeId가 있으면 해당 챌린지 바로 열기
        if (initialChallengeId) {
          const ch = data.find(c => c.id === initialChallengeId);
          if (ch) {
            setSel(ch);
            updateSeo(ch);
            if (user?.uid) setMyApp(await loadMyApplication(ch.id, user.uid));
            try { setPublicApps(await loadPublicApplicants(ch.id)); } catch { setPublicApps([]); }
            setView("detail");
          } else { setView("list"); }
        }
      } catch { setChallenges([]); if (initialChallengeId) setView("list"); }
      setLoading(false);
    })();
  }, []);

  const openDetail = async ch => {
    setSel(ch); setView("detail"); window.scrollTo(0, 0);
    window.history.pushState(null, "", "/growth/" + ch.id);
    updateSeo(ch);
    if (user?.uid) setMyApp(await loadMyApplication(ch.id, user.uid));
    try { setPublicApps(await loadPublicApplicants(ch.id)); } catch { setPublicApps([]); }
  };
  const openBoard = async ch => {
    // 관리자 또는 참여 확정자만 접근 가능
    if (!user) { showToast("로그인 후 이용할 수 있습니다"); if (typeof window.__onLoginRequest === "function") window.__onLoginRequest(); return; }
    if (!isAdmin) {
      // 이미 로컬에 확정 상태가 있으면 DB 재조회 생략
      if (myApp?.status === "confirmed") { /* OK */ }
      else {
        try {
          const { data: appCheck } = await supabase.from("challenge_applications").select("status").eq("challenge_id", ch.id).eq("uid", user.uid).maybeSingle();
          if (!appCheck || appCheck.status !== "confirmed") { showToast("참여가 확정된 회원만 미션 게시판에 입장할 수 있습니다"); return; }
        } catch { showToast("접근 권한을 확인할 수 없습니다. 다시 시도해주세요."); return; }
      }
    }
    setSel(ch); try { setMissions(await loadMissions(ch.id)); } catch { setMissions([]); } setView("board"); window.scrollTo(0, 0); window.history.pushState(null, "", "/growth/" + ch.id + "/board"); document.title = `미션 게시판 - ${ch.title} | SNS메이킷`;
  };
  const openAdmin = async ch => { if (!isAdmin) return; setSel(ch); try { setApps(await loadApplications(ch.id)); } catch { setApps([]); } setView("admin"); window.scrollTo(0, 0); };
  const back = () => { setView("list"); setSel(null); setMyApp(null); window.history.pushState(null, "", "/growth"); resetSeo(); window.scrollTo(0, 0); };
  const getStatus = ch => { if (ch.status === "completed") return "completed"; const now = new Date(); if (ch.start_date && new Date(ch.start_date) <= now && ch.end_date && new Date(ch.end_date) >= now) return "ongoing"; if (ch.recruit_end && new Date(ch.recruit_end) < now) return "ongoing"; return "recruiting"; };

  /* ── Toast ── */
  const Toast = toast ? <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, background: PRIMARY, color: "#fff", padding: "12px 24px", borderRadius: 99, fontSize: 14, fontWeight: 700, boxShadow: "0 8px 32px rgba(59,130,246,0.3)" }}>{toast}</div> : null;

  /* ── Loading ── */
  if (loading) return (
    <div style={{ textAlign: "center", padding: "120px 0", color: C.muted }}>
      <div style={{ display: "inline-flex", width: 44, height: 44, borderRadius: "50%", border: "3px solid " + bdr, borderTopColor: PRIMARY, animation: "spin 1s linear infinite", marginBottom: 16 }} />
      <div style={{ fontSize: 15, fontWeight: 600 }}>불러오는 중...</div>
    </div>
  );

  /* ═══ LIST (랜딩) ════════════════════════════════════════ */
  if (view === "list") return (
    <div style={{ background: isDark ? "transparent" : "#fff", minHeight: "calc(100vh - 64px)" }}>
      {Toast}

      {/* 히어로 - 사이트 톤 (밝은 블루 그라데이션) */}
      <div style={{ background: "linear-gradient(180deg, #E8F0FF 0%, #F5F9FF 50%, #fff 100%)", padding: mob ? "56px 20px 48px" : "80px 40px 64px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        {/* 글로우 블롭 */}
        <div style={{ position: "absolute", top: -60, left: "30%", width: 300, height: 300, borderRadius: "50%", background: "rgba(59,130,246,0.08)", filter: "blur(100px)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -40, right: "20%", width: 250, height: 250, borderRadius: "50%", background: "rgba(52,199,89,0.06)", filter: "blur(80px)", pointerEvents: "none" }} />

        <div style={{ position: "relative", maxWidth: 700, margin: "0 auto" }}>
          <div style={{ display: "inline-block", background: PRIMARY, color: "#fff", fontSize: 12, fontWeight: 700, padding: "5px 16px", borderRadius: 99, marginBottom: 20 }}>BOOTCAMP</div>
          <h1 style={{ fontSize: mob ? "clamp(26px,6vw,38px)" : "clamp(36px,5vw,52px)", fontWeight: 700, color: "#1a1a1a", lineHeight: 1.3, marginBottom: 14, letterSpacing: "-0.02em" }}>
            함께 성장하는<br/>
            <span style={{ color: PRIMARY }}>SNS 성장 프로그램</span>
          </h1>
          <p style={{ fontSize: mob ? 14 : 17, color: "#4a5568", lineHeight: 1.7, marginBottom: 32 }}>
            성장 프로그램, 클래스, 스터디, 모임까지 다양한 프로그램을 운영합니다.<br/>
            함께 실행하고, 서로 피드백하며 성장하세요.
          </p>
          {isAdmin && (
            <button onClick={() => { setSel(null); setView("editor"); }}
              style={{ padding: "16px 36px", borderRadius: 99, border: "none", background: PRIMARY, color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer", transition: "transform 0.18s", fontFamily: "inherit" }}
              onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"} onMouseLeave={e => e.currentTarget.style.transform = "none"}>
              + 새 성장 프로그램 만들기
            </button>
          )}
        </div>
      </div>

      {/* 카드 그리드 */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: mob ? "32px 16px 80px" : "48px 20px 100px" }}>
        {challenges.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 20px", color: C.muted }}>
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="1" strokeLinecap="round" style={{ margin: "0 auto 20px", display: "block", opacity: 0.25 }}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 8 }}>아직 등록된 성장 프로그램가 없어요</div>
            <div style={{ fontSize: 14 }}>곧 새로운 성장 프로그램가 시작될 예정입니다</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill,minmax(${mob ? "100%" : "340px"},1fr))`, gap: 24 }}>
            {challenges.filter(ch => ch.visibility !== "admin" || user?.role === "admin").map(ch => {
              const st = STATUS_MAP[getStatus(ch)] || STATUS_MAP.recruiting;
              return (
                <div key={ch.id} onClick={() => openDetail(ch)}
                  style={{ borderRadius: 20, border: "1px solid " + bdr, overflow: "hidden", cursor: "pointer", background: card, transition: "transform 0.18s, box-shadow 0.18s", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,0.08)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 1px 2px rgba(0,0,0,0.04)"; }}>
                  {ch.thumbnail ? (
                    <div style={{ width: "100%", aspectRatio: "16/9", overflow: "hidden", background: isDark ? "rgba(255,255,255,0.05)" : "#f0f4ff" }}>
                      <img src={ch.thumbnail} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    </div>
                  ) : (
                    <div style={{ width: "100%", aspectRatio: "16/9", background: "linear-gradient(135deg, #E8F0FF, #f0f4ff)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: PRIMARY, background: "rgba(59,130,246,0.1)", padding: "8px 20px", borderRadius: 99 }}>CHALLENGE</span>
                    </div>
                  )}
                  <div style={{ padding: "20px 22px 22px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: st.color, background: st.bg, padding: "4px 12px", borderRadius: 99 }}>{st.label}</span>
                      {ch.type && ch.type !== "challenge" && (() => { const tp = TYPE_MAP[ch.type]; return tp ? <span style={{ fontSize: 11, fontWeight: 800, color: tp.color, background: tp.bg, padding: "4px 12px", borderRadius: 99 }}>{tp.label}</span> : null; })()}
                      {getStatus(ch) === "recruiting" && ch.recruit_end && <span style={{ fontSize: 11, fontWeight: 700, color: "#ef4444" }}>{dday(ch.recruit_end)}</span>}
                      <span style={{ fontSize: 12, fontWeight: 700, color: ch.price > 0 ? "#1a1a1a" : "#22c55e", marginLeft: "auto" }}>
                        {ch.price > 0 ? `${Number(ch.price).toLocaleString()}원` : "무료"}
                      </span>
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 8, lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ch.title}</div>
                    <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.7, marginBottom: 16, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {ch.subtitle || ch.description?.replace(/<[^>]*>/g, "").slice(0, 100)}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 16, paddingTop: 14, borderTop: "1px solid " + bdr, fontSize: 12, color: C.muted }}>
                      {[
                        [<svg key="c" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>, `${ch.duration || "10"}일`],
                        [<svg key="u" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>, `${ch.application_count || 0}명 참여`],
                        ...(ch.platform ? [[<svg key="p" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/></svg>, ch.platform]] : []),
                      ].map(([icon, text], i) => (
                        <span key={i} style={{ display: "flex", alignItems: "center", gap: 5 }}>{icon}{text}</span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  /* ═══ DETAIL ═════════════════════════════════════════════ */
  if (view === "detail" && sel) {
    const ch = sel;
    const st = STATUS_MAP[getStatus(ch)] || STATUS_MAP.recruiting;
    const curStatus = getStatus(ch);
    const canApply = curStatus === "recruiting" || curStatus === "ongoing";
    const isParticipant = myApp?.status === "confirmed";
    const hasApplied = myApp && myApp.status !== "cancelled";

    return (
      <div style={{ background: isDark ? "transparent" : "#fff", minHeight: "calc(100vh - 64px)" }}>
        {Toast}
        {/* 상단 - 밝은 블루 배경 */}
        <div style={{ background: "linear-gradient(180deg, #E8F0FF 0%, #F5F9FF 100%)", padding: mob ? "24px 16px 32px" : "32px 40px 48px" }}>
          <div style={{ maxWidth: 800, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <button onClick={back} style={{ background: "rgba(0,0,0,0.04)", border: "none", color: "#4a5568", padding: "8px 16px", borderRadius: 99, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
                목록으로
              </button>
              {isAdmin && (
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => openAdmin(ch)} style={{ background: "rgba(0,0,0,0.04)", border: "none", color: "#4a5568", padding: "8px 16px", borderRadius: 99, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                    신청자 관리
                  </button>
                  <button onClick={() => { setSel(ch); setView("editor"); window.scrollTo(0, 0); }} style={{ background: "rgba(0,0,0,0.04)", border: "none", color: "#4a5568", padding: "8px 16px", borderRadius: 99, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4z"/></svg>
                    수정
                  </button>
                </div>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: st.color, background: st.bg, padding: "5px 14px", borderRadius: 99 }}>{st.label}</span>
              {curStatus === "recruiting" && ch.recruit_end && <span style={{ fontSize: 13, fontWeight: 700, color: "#ef4444" }}>{dday(ch.recruit_end)}</span>}
            </div>
            <h1 style={{ fontSize: mob ? "clamp(24px,5vw,32px)" : "clamp(30px,4vw,42px)", fontWeight: 700, color: "#1a1a1a", lineHeight: 1.3, marginBottom: 8 }}>{ch.title}</h1>
            {ch.subtitle && <p style={{ fontSize: mob ? 14 : 17, color: "#4a5568", lineHeight: 1.7 }}>{ch.subtitle}</p>}
          </div>
        </div>

        <div style={{ maxWidth: 800, margin: "0 auto", padding: mob ? "28px 16px 80px" : "40px 20px 100px" }}>
          {ch.thumbnail && <div style={{ borderRadius: 20, overflow: "hidden", marginBottom: 36, boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}><img src={ch.thumbnail} alt="" style={{ width: "100%", display: "block" }} /></div>}

          {/* 모집 정보 */}
          <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr 1fr" : "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 44 }}>
            {[
              { label: "기간", value: `${ch.duration || 10}일`, sub: ch.start_date ? `${fmt(ch.start_date)} ~` : "" },
              { label: "참가비", value: ch.price > 0 ? `${Number(ch.price).toLocaleString()}원` : "무료", sub: "추후 안내" },
              { label: "진행자", value: ch.host_name || "-", sub: `${publicApps.length}명 참여중` },
              { label: "플랫폼", value: ch.platform || "모든 SNS", sub: ch.daily_mission || "매일 1포스팅" },
            ].map((info, i) => (
              <div key={i} style={{ background: isDark ? "rgba(255,255,255,0.04)" : "#f9fafb", border: "1px solid " + bdr, borderRadius: 16, padding: "18px 16px", textAlign: "center" }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, marginBottom: 6 }}>{info.label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: C.text }}>{info.value}</div>
                {info.sub && <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{info.sub}</div>}
              </div>
            ))}
          </div>

          {/* 참여자 현황 - 요약 */}
          {publicApps.length > 0 && (
            <div style={{ marginBottom: 24, padding: "16px 20px", borderRadius: 14, background: isDark ? "rgba(255,255,255,0.03)" : "#f9fafb", border: "1px solid " + bdr, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ display: "flex" }}>
                  {publicApps.slice(0, 5).map((a, i) => (
                    <div key={a.id} style={{ width: 28, height: 28, borderRadius: "50%", background: PRIMARY, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff", marginLeft: i > 0 ? -8 : 0, border: "2px solid " + (isDark ? "#1a1a2e" : "#f9fafb"), zIndex: 5 - i }}>{(a.name || "?")[0]}</div>
                  ))}
                  {publicApps.length > 5 && <div style={{ width: 28, height: 28, borderRadius: "50%", background: isDark ? "rgba(255,255,255,0.1)" : "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: C.muted, marginLeft: -8, border: "2px solid " + (isDark ? "#1a1a2e" : "#f9fafb") }}>+{publicApps.length - 5}</div>}
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{publicApps.length}명 참여 중</span>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#22c55e" }}>{publicApps.filter(a => a.status === "confirmed").length}명 확정</span>
            </div>
          )}

          {/* 참여자/관리자 미션 게시판 바로가기 */}
          {(isParticipant || isAdmin) && (
            <div onClick={() => openBoard(ch)} style={{ background: PRIMARY, borderRadius: 16, padding: mob ? "20px 18px" : "22px 28px", marginBottom: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, transition: "transform 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
              onMouseLeave={e => e.currentTarget.style.transform = "none"}>
              <div>
                <div style={{ fontSize: mob ? 16 : 18, fontWeight: 800, color: "#fff", marginBottom: 4 }}>미션 게시판 입장</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>오늘의 인증을 등록하세요</div>
              </div>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
          )}

          {/* 탭 메뉴 */}
          <DetailTabs
            ch={ch} C={C} bdr={bdr} card={card} isDark={isDark} mob={mob}
            isParticipant={isParticipant} hasApplied={hasApplied} canApply={canApply} isAdmin={isAdmin}
            openBoard={() => openBoard(ch)} openAdmin={() => openAdmin(ch)}
            onApply={() => { setView("apply"); window.scrollTo(0, 0); }}
            user={user} myApp={myApp} setMyApp={setMyApp}
          />
        </div>
      </div>
    );
  }

  /* ═══ APPLY ══════════════════════════════════════════════ */
  if (view === "apply" && sel) return <ApplyForm ch={sel} C={C} bdr={bdr} card={card} isDark={isDark} mob={mob} user={user}
    onBack={() => { setView("detail"); window.scrollTo(0, 0); }}
    onSubmit={async fd => {
      const { sns_links, ...cleanFd } = fd;
      const app = await submitApplication({ ...cleanFd, challenge_id: sel.id, uid: user?.uid || "guest_" + Date.now() });
      setMyApp(app);
      setView("confirmed"); window.scrollTo(0, 0);
    }} />;

  /* ═══ CONFIRMED ══════════════════════════════════════════ */
  if (view === "confirmed" && sel) return (
    <div style={{ background: isDark ? "transparent" : "#fff", minHeight: "calc(100vh - 64px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ maxWidth: 500, width: "100%", background: card, border: "1px solid " + bdr, borderRadius: 24, padding: mob ? "36px 20px" : "52px 40px", textAlign: "center", boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}>
        <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(34,197,94,0.08)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#34C759" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: C.text, marginBottom: 10 }}>신청 완료!</h2>
        <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.8, marginBottom: 28 }}>
          관리자 확인 후 참여가 확정되면 안내를 드립니다.
          {sel.start_date && <><br/>성장 프로그램 시작일: <strong style={{ color: C.text }}>{fmt(sel.start_date)}</strong></>}
        </p>
        <StartProofUploader ch={sel} C={C} bdr={bdr} isDark={isDark} user={user} myApp={myApp} setMyApp={setMyApp} />
        <div style={{ marginTop: 16 }}>
          <button onClick={back} style={{ padding: "12px 28px", borderRadius: 99, border: "1px solid " + bdr, background: "transparent", color: C.muted, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>목록으로</button>
        </div>
      </div>
    </div>
  );

  /* ═══ BOARD ══════════════════════════════════════════════ */
  if (view === "board" && sel) return <MissionBoard ch={sel} C={C} bdr={bdr} card={card} isDark={isDark} mob={mob} user={user} myApp={myApp} setMyApp={setMyApp} missions={missions} setMissions={setMissions} isParticipant={myApp?.status === "confirmed" || isAdmin} onBack={() => { setView("detail"); window.scrollTo(0, 0); }} />;

  /* ═══ ADMIN ══════════════════════════════════════════════ */
  if (view === "admin" && sel) return <AdminPanel ch={sel} C={C} bdr={bdr} card={card} isDark={isDark} mob={mob} apps={apps} setApps={setApps} onBack={() => { setView("detail"); window.scrollTo(0, 0); }} onEdit={() => { setView("editor"); window.scrollTo(0, 0); }}
    onViewMember={async (member) => { setSel(sel); try { setMissions(await loadMissions(sel.id)); } catch { setMissions([]); } setView("board"); window.scrollTo(0, 0); setTimeout(() => { setViewAsMember(member); setTab("calendar"); }, 100); }}
    onStatus={async (id, s) => { await updateApplicationStatus(id, s); setApps(p => p.map(a => a.id === id ? { ...a, status: s } : a)); showToast(s === "confirmed" ? "참여 확정!" : "상태 변경 완료"); }}
    onDelete={async (id) => { if (!confirm("이 신청자를 삭제하시겠습니까?")) return; await supabase.from("challenge_applications").delete().eq("id", id); setApps(p => p.filter(a => a.id !== id)); const newCount = Math.max(0, (sel.application_count || 1) - 1); await supabase.from("challenges").update({ application_count: newCount }).eq("id", sel.id); setSel(p => ({ ...p, application_count: newCount })); showToast("신청자 삭제 완료"); }}
    onBadge={async (app) => {
      if (!app.uid || app.uid.startsWith("guest_")) { showToast("비회원에게는 뱃지를 지급할 수 없습니다"); return; }
      const { error } = await supabase.from("user_badges").insert({ id: "ub_" + Date.now(), uid: app.uid, challenge_id: sel.id, earned_at: new Date().toISOString() });
      if (error?.code === "23505") { showToast("이미 지급된 뱃지입니다"); return; }
      if (error) { showToast("뱃지 지급 실패: " + error.message); return; }
      showToast(`${app.name}에게 뱃지 지급 완료!`);
    }} />;

  /* ═══ EDITOR ═════════════════════════════════════════════ */
  if (view === "editor") return <Editor ch={sel} C={C} bdr={bdr} card={card} isDark={isDark} mob={mob} user={user} onBack={back}
    onSave={async fd => { if (!fd.host_name && user?.nick) fd.host_name = user.nick; const s = await saveChallenge(fd); setChallenges(p => { const e = p.find(c => c.id === s.id); return e ? p.map(c => c.id === s.id ? s : c) : [s, ...p]; }); showToast("저장 완료"); back(); }}
    onDelete={async id => { if (!confirm("정말 삭제하시겠습니까?")) return; await deleteChallenge(id); setChallenges(p => p.filter(c => c.id !== id)); showToast("삭제 완료"); back(); }} />;

  return null;
}

/* ── 공통 CTA 버튼 스타일 ── */
function ctaBtn(bg) {
  return { padding: "16px 40px", borderRadius: 99, border: "none", background: bg, color: "#fff", fontSize: 17, fontWeight: 700, cursor: "pointer", boxShadow: `0 4px 16px ${bg}40`, fontFamily: "inherit", transition: "all 0.18s" };
}

/* ── 섹션 ── */
/* ── 추가활동 독립 탭 ── */
function ExtraActivityTab({ ch, C, bdr, card, isDark, mob, user, missions, setMissions, isParticipant, isAdmin, vM, totalDays, currentDayNum, dayDate, showToast, fixedDay }) {
  const [selDay, setSelDay] = useState(fixedDay || null);
  const [category, setCategory] = useState(null);
  const [snsLink, setSnsLink] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);
  const catLabels = { comment: "댓글", like: "좋아요", share: "공유/리포스트", other: "기타" };

  // 인증 완료된 Day만 선택 가능
  const certifiedDays = [];
  for (let d = 1; d <= Math.min(totalDays, currentDayNum); d++) {
    if (vM[d]) certifiedDays.push(d);
  }

  const handleFile = e => { const f = e.target.files?.[0]; if (f) { setFile(f); const r = new FileReader(); r.onload = ev => setPreview(ev.target.result); r.readAsDataURL(f); } };

  const submit = async () => {
    if (!file || !selDay || !category) return;
    setBusy(true);
    try {
      // 미인증 Day면 빈 미션 레코드 먼저 생성
      let mission = vM[selDay];
      if (!mission) {
        const row = await submitMission({ challenge_id: ch.id, uid: user.uid, nick: user.nick || "참가자", day: selDay, link: "", body: "", extra_link: null, screenshot_url: null });
        setMissions(prev => [row, ...prev]);
        mission = row;
      }
      const ext = file.name.split(".").pop();
      const path = `challenge-proofs/${ch.id}/${user.uid}/extra_${selDay}_${category}_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("uploads").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("uploads").getPublicUrl(path);
      const existing = getExtraLinks(mission.extra_link);
      const newEntry = { img: publicUrl, cat: category, link: snsLink.trim() || null };
      const updated = JSON.stringify([...existing, newEntry]);
      await supabase.from("challenge_missions").update({ extra_link: updated }).eq("id", mission.id);
      setMissions(prev => prev.map(m => m.id === mission.id ? { ...m, extra_link: updated } : m));
      setFile(null); setPreview(""); setCategory(null); setSnsLink("");
      showToast(`추가활동 등록 완료! Day ${selDay} ${catLabels[category]} +0.5점`);
    } catch (e) { alert("업로드 실패: " + e.message); }
    setBusy(false);
  };

  return (
    <div>
      {/* 안내 */}
      <div style={{ padding: "14px 18px", borderRadius: 12, background: isDark ? "rgba(245,158,11,0.06)" : "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.12)", marginBottom: 20, fontSize: 13, color: C.muted, lineHeight: 1.6 }}>
        댓글, 좋아요, 공유 등 추가활동을 올리면 <strong style={{ color: "#f59e0b" }}>각 +0.5점</strong> 가산됩니다. 미션 인증 없이도 올릴 수 있습니다.
      </div>

      {!fixedDay && certifiedDays.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 20px", color: C.muted, border: "1px dashed " + bdr, borderRadius: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>아직 인증된 Day가 없습니다</div>
          <div style={{ fontSize: 13 }}>Day를 선택하면 추가활동을 올릴 수 있습니다</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr", gap: 20 }}>
          {/* 왼쪽: 업로드 폼 */}
          <div>
            {/* Day 선택 */}
            {!fixedDay && <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 8 }}>Day 선택</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {certifiedDays.map(d => {
                  const extraCount = getExtraLinks(vM[d].extra_link).length;
                  return (
                    <button key={d} onClick={() => setSelDay(d)}
                      style={{ padding: "8px 14px", borderRadius: 10, border: selDay === d ? `2px solid ${PRIMARY}` : "1px solid " + bdr, background: selDay === d ? "rgba(59,130,246,0.08)" : card, color: selDay === d ? PRIMARY : C.text, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", position: "relative" }}>
                      Day {d}
                      {extraCount > 0 && <span style={{ position: "absolute", top: -4, right: -4, width: 16, height: 16, borderRadius: "50%", background: "#f59e0b", color: "#fff", fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{extraCount}</span>}
                    </button>
                  );
                })}
              </div>
            </div>}

            {selDay && (<>
              {/* 카테고리 */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 8 }}>활동 유형</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {Object.entries(catLabels).map(([id, label]) => (
                    <button key={id} onClick={() => setCategory(id)}
                      style={{ padding: "8px 16px", borderRadius: 99, border: category === id ? "none" : "1px solid " + bdr, background: category === id ? "#f59e0b" : "transparent", color: category === id ? "#fff" : C.text, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {category && (<>
                {/* SNS 링크 */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 6 }}>SNS 링크 (선택)</div>
                  <input value={snsLink} onChange={e => setSnsLink(e.target.value)} placeholder="인증한 게시글 URL" style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: "1px solid " + bdr, background: isDark ? "rgba(255,255,255,0.06)" : "#fff", color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
                </div>

                {/* 스크린샷 */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 6 }}>스크린샷</div>
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
                  <div onClick={() => fileRef.current?.click()}
                    style={{ border: `2px dashed ${preview ? "#f59e0b" : bdr}`, borderRadius: 12, padding: preview ? 0 : "24px 16px", textAlign: "center", cursor: "pointer", background: isDark ? "rgba(245,158,11,0.04)" : "rgba(245,158,11,0.02)", overflow: "hidden" }}>
                    {preview ? (
                      <div style={{ position: "relative" }}>
                        <img src={preview} alt="미리보기" style={{ width: "100%", maxHeight: 200, objectFit: "cover", display: "block" }} />
                        <button onClick={e => { e.stopPropagation(); setFile(null); setPreview(""); }} style={{ position: "absolute", top: 8, right: 8, width: 24, height: 24, borderRadius: "50%", background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>x</button>
                      </div>
                    ) : (
                      <div style={{ color: C.muted, fontSize: 13 }}>{catLabels[category]} 화면을 캡처해주세요</div>
                    )}
                  </div>
                </div>

                {/* 저장 버튼 */}
                <button disabled={!file || busy} onClick={submit}
                  style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", background: file ? "#f59e0b" : (isDark ? "rgba(255,255,255,0.1)" : "#e5e7eb"), color: file ? "#fff" : C.muted, fontSize: 15, fontWeight: 800, cursor: file ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
                  {busy ? "저장 중..." : `${catLabels[category]} 인증 저장 (+0.5점)`}
                </button>
              </>)}
            </>)}
          </div>

          {/* 오른쪽: 내 추가활동 목록 */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12 }}>내 추가활동 기록</div>
            {(() => {
              const allExtras = [];
              for (let d = 1; d <= totalDays; d++) {
                if (vM[d]) {
                  getExtraLinks(vM[d].extra_link).forEach((item, i) => {
                    allExtras.push({ day: d, item, idx: i });
                  });
                }
              }
              if (allExtras.length === 0) return <div style={{ padding: "32px 16px", textAlign: "center", color: C.muted, fontSize: 13, border: "1px dashed " + bdr, borderRadius: 12 }}>아직 추가활동이 없습니다</div>;
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {allExtras.map(({ day, item, idx }) => (
                    <div key={`${day}-${idx}`} style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 12px", borderRadius: 10, background: card, border: "1px solid " + bdr }}>
                      <a href={extraImg(item)} target="_blank" rel="noopener noreferrer"><img src={extraImg(item)} alt="" style={{ width: 50, height: 36, objectFit: "cover", borderRadius: 6, display: "block", flexShrink: 0 }} /></a>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                          <span style={{ fontWeight: 700, color: PRIMARY }}>Day {day}</span>
                          {extraCat(item) && <span style={{ fontWeight: 700, color: "#f59e0b", background: "rgba(245,158,11,0.1)", padding: "1px 7px", borderRadius: 99, fontSize: 10 }}>{catLabels[extraCat(item)] || extraCat(item)}</span>}
                          <span style={{ color: "#f59e0b", fontWeight: 700 }}>+0.5</span>
                        </div>
                        {extraUrl(item) && <a href={extraUrl(item)} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: C.muted, textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>{extraUrl(item)}</a>}
                      </div>
                    </div>
                  ))}
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#f59e0b", textAlign: "right", marginTop: 4 }}>총 {allExtras.length}개 · +{allExtras.length * 0.5}점</div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

function Sect({ title, children, C, bdr }) {
  return <div style={{ marginBottom: 36 }}>
    <h3 style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid " + bdr }}>{title}</h3>
    {children}
  </div>;
}

/* ── 상세 페이지 탭 분리 ── */
function DetailTabs({ ch, C, bdr, card, isDark, mob, isParticipant, hasApplied, canApply, isAdmin, openBoard, openAdmin, onApply, user, myApp, setMyApp }) {
  const [dtab, setDtab] = useState("intro");
  const [rankData, setRankData] = useState([]);
  const totalDays = Math.max(parseInt(ch.duration) || 10, 1);
  const startDate = ch.start_date ? new Date(ch.start_date) : new Date();
  const dayDate = d => { const dt = new Date(startDate); dt.setDate(dt.getDate() + d - 1); return dt; };
  const isWeekend = d => { const dow = dayDate(d).getDay(); return dow === 0 || dow === 6; };
  const localDateOnly = dt => new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
  const lateDaysFor = m => { if (!m?.created_at || Number(m.day) <= 0) return 0; return Math.max(0, Math.floor((localDateOnly(new Date(m.created_at)) - localDateOnly(dayDate(Number(m.day)))) / 86400000)); };
  const scoreFor = (day, m) => { const base = isWeekend(Number(day)) ? 2 : 1; const bonus = getExtraLinks(m.extra_link).length * 0.5; const penalty = Math.min(base + bonus, lateDaysFor(m) * 0.5); return Math.max(0, base + bonus - penalty); };
  const calcRankScore = (days) => Object.entries(days).reduce((s, [d, m]) => s + scoreFor(d, m), 0);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.from("challenge_missions").select("uid,nick,day,extra_link,created_at").eq("challenge_id", ch.id).gt("day", 0);
        if (data) {
          const map = {};
          data.forEach(m => {
            if (!map[m.uid]) map[m.uid] = { nick: m.nick, uid: m.uid, days: {}, count: 0 };
            if (!map[m.uid].days[m.day]) { map[m.uid].days[m.day] = m; map[m.uid].count++; }
          });
          setRankData(Object.values(map).sort((a, b) => calcRankScore(b.days) - calcRankScore(a.days)));
        }
      } catch {}
    })();
  }, [ch.id]);

  const tabs = [
    { id: "intro", label: "소개" },
    { id: "ranking", label: "순위표" },
    { id: "board", label: "현황판" },
    { id: "detail", label: "상세 안내" },
    ...(!isParticipant && canApply && !hasApplied ? [{ id: "apply", label: "신청하기" }] : []),
    ...(isAdmin ? [{ id: "admin", label: "관리" }] : []),
  ];

  return (
    <div>
      {/* 탭 바 */}
      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid " + bdr, marginBottom: 24 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setDtab(t.id)}
            style={{ padding: mob ? "12px 14px" : "12px 24px", border: "none", cursor: "pointer", fontSize: 14, fontWeight: dtab === t.id ? 700 : 500, background: "transparent", color: dtab === t.id ? PRIMARY : C.muted, borderBottom: dtab === t.id ? `2px solid ${PRIMARY}` : "2px solid transparent", marginBottom: -1, fontFamily: "inherit", transition: "all 0.15s" }}>
            {t.label}
          </button>
        ))}
        {(isParticipant || isAdmin) && (
          <button onClick={openBoard}
            style={{ marginLeft: "auto", padding: "8px 20px", borderRadius: 99, border: "none", background: PRIMARY, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", alignSelf: "center", marginBottom: 4 }}>
            미션 게시판
          </button>
        )}
      </div>

      {/* 소개 탭 */}
      {dtab === "intro" && (
        <div>
          {ch.description && <Sect title="프로그램 소개" C={C} bdr={bdr}><div style={{ fontSize: 14, color: C.text, lineHeight: 1.9 }} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(ch.description) }} /></Sect>}
          {ch.target_audience && <Sect title="이런 사람에게 추천해요" C={C} bdr={bdr}><div style={{ fontSize: 14, color: C.text, lineHeight: 1.9 }} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(ch.target_audience) }} /></Sect>}
          {/* 미니 순위표 */}
          {rankData.length > 0 && (
            <div style={{ background: card, border: "1px solid " + bdr, borderRadius: 16, padding: mob ? "18px 16px" : "22px 24px", marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                  <span style={{ fontSize: 15, fontWeight: 800, color: C.text }}>실시간 순위</span>
                </div>
                <button onClick={() => setDtab("ranking")} style={{ fontSize: 12, fontWeight: 700, color: PRIMARY, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>전체 보기 &rarr;</button>
              </div>
              {rankData.slice(0, 5).map((m, i) => {
                const score = calcRankScore(m.days);
                return (
                  <div key={m.uid} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < Math.min(rankData.length, 5) - 1 ? "1px solid " + bdr : "none" }}>
                    <span style={{ fontSize: 14, fontWeight: 900, color: i < 3 ? ["#f59e0b","#94a3b8","#cd7f32"][i] : C.muted, width: 24, textAlign: "center" }}>{i + 1}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.text, flex: 1 }}>{maskNick(m.nick)}</span>
                    <span style={{ fontSize: 15, fontWeight: 800, color: "#f59e0b" }}>{score}점</span>
                  </div>
                );
              })}
            </div>
          )}
          {/* 하단 CTA */}
          <div style={{ background: isDark ? "rgba(59,130,246,0.06)" : "rgba(59,130,246,0.04)", border: "1px solid rgba(59,130,246,0.12)", borderRadius: 20, padding: mob ? "28px 18px" : "36px 32px", textAlign: "center", marginTop: 24 }}>
            <div style={{ fontSize: mob ? 18 : 24, fontWeight: 700, color: C.text, marginBottom: 12 }}>
              {(isParticipant || isAdmin) ? "미션 게시판에 입장하세요" : hasApplied ? "신청이 완료되었습니다" : canApply ? "지금 바로 신청하세요" : "다음 프로그램을 기대해주세요"}
            </div>
            {(isParticipant || isAdmin) ? (
              <button onClick={openBoard} style={ctaBtn(PRIMARY)}>미션 게시판 입장</button>
            ) : hasApplied ? (
              <div style={{ maxWidth: 420, margin: "0 auto" }}>
                <p style={{ fontSize: 14, color: C.muted, marginBottom: 16 }}>관리자 확인 후 참여가 확정됩니다</p>
                <StartProofUploader ch={ch} C={C} bdr={bdr} isDark={isDark} user={user} myApp={myApp} setMyApp={setMyApp} compact />
              </div>
            ) : canApply ? (
              <button onClick={onApply} style={ctaBtn(PRIMARY)}>신청하기</button>
            ) : null}
          </div>
        </div>
      )}

      {/* 현황판 탭 */}
      {/* 순위표 탭 */}
      {dtab === "ranking" && (() => {
        const scores = rankData.map(m => calcRankScore(m.days));
        const maxScore = Math.max(...scores, 1);
        const getRank = (idx) => {
          if (idx === 0) return 1;
          return scores[idx] === scores[idx - 1] ? getRank(idx - 1) : idx + 1;
        };
        const medalColors = { 1: "#f59e0b", 2: "#94a3b8", 3: "#cd7f32" };
        return (
          <div>
            {rankData.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 20px", color: C.muted, border: "1px dashed " + bdr, borderRadius: 16 }}>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>아직 순위 데이터가 없습니다</div>
                <div style={{ fontSize: 13 }}>참가자들이 인증을 시작하면 순위가 표시됩니다</div>
              </div>
            ) : (<>
              {/* 전체 레이스 트랙 (한눈에 보기) */}
              <div style={{ background: card, border: "1px solid " + bdr, borderRadius: 20, padding: mob ? "20px 14px" : "28px 24px", marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>마라톤 레이스</div>
                  <div style={{ fontSize: 12, color: C.muted }}>🏁 {maxScore}점</div>
                </div>
                {/* 큰 트랙 — 일자 레이스 */}
                <div style={{ position: "relative", height: 70, borderRadius: 14, background: isDark ? "rgba(255,255,255,0.02)" : "#f8faf8", border: "1px solid " + bdr, overflow: "visible" }}>
                  {/* 바닥 트랙 라인 */}
                  <div style={{ position: "absolute", bottom: 8, left: 0, right: 0, height: 3, borderRadius: 2, background: isDark ? "rgba(255,255,255,0.06)" : "#e5e7eb" }} />
                  {/* 거리 마커 */}
                  {[25, 50, 75].map(p => <div key={p} style={{ position: "absolute", left: `${p}%`, bottom: 0, height: 14, width: 1, borderLeft: "1px dashed " + (isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)") }} />)}
                  {/* 골인 */}
                  <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 3, background: "#22c55e", borderRadius: "0 14px 14px 0" }} />
                  <div style={{ position: "absolute", right: 6, top: 8, fontSize: 20 }}>🏁</div>
                  {/* 캐릭터들 — 같은 바닥선 위 */}
                  {rankData.map((m, idx) => {
                    const score = scores[idx];
                    const runPct = Math.max(2, (score / maxScore) * 82);
                    const medal = medalColors[getRank(idx)];
                    const c = medal || PRIMARY;
                    return (
                      <div key={m.uid} className={score > 0 ? "run-anim" : ""} style={{ position: "absolute", left: `calc(${runPct}% - 14px)`, bottom: 10, transition: "left 1s ease", zIndex: rankData.length - idx }}>
                        <RunnerChar nick={m.nick} color={c} running={score > 0} size={36} />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 순위 리스트 */}
              <div style={{ background: card, border: "1px solid " + bdr, borderRadius: 16, overflow: "hidden" }}>
                {rankData.map((m, idx) => {
                  const score = scores[idx];
                  const rank = getRank(idx);
                  const pct = Math.round((m.count / totalDays) * 100);
                  const medal = medalColors[rank];
                  const isTied = idx > 0 && scores[idx] === scores[idx - 1];
                  return (
                    <div key={m.uid} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 18px", borderBottom: idx < rankData.length - 1 ? "1px solid " + bdr : "none", background: rank <= 3 ? (medal + "08") : "transparent" }}>
                      <span style={{ fontSize: 16, fontWeight: 900, color: medal || C.muted, width: 26, textAlign: "center", flexShrink: 0 }}>{rank}</span>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: medal || PRIMARY, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{(m.nick || "?")[0]}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{maskNick(m.nick)}</span>
                        {isTied && <span style={{ fontSize: 9, fontWeight: 700, color: "#f59e0b", background: "rgba(245,158,11,0.1)", padding: "1px 6px", borderRadius: 99, marginLeft: 6 }}>동점</span>}
                      </div>
                      <span style={{ fontSize: 11, color: C.muted, flexShrink: 0 }}>{m.count}일 ({pct}%)</span>
                      <span style={{ fontSize: 18, fontWeight: 900, color: medal || "#f59e0b", flexShrink: 0, minWidth: 50, textAlign: "right" }}>{score}점</span>
                    </div>
                  );
                })}
              </div>
            </>)}
          </div>
        );
      })()}

      {dtab === "board" && (
        <div>
          <PublicLinkBoard challengeId={ch.id} C={C} bdr={bdr} card={card} isDark={isDark} mob={mob} title={ch.title} isAdmin={isAdmin} />
        </div>
      )}

      {/* 상세 안내 탭 */}
      {dtab === "detail" && (
        <div>
          {ch.process && <Sect title="진행 방식" C={C} bdr={bdr}><div style={{ fontSize: 14, color: C.text, lineHeight: 1.9 }} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(ch.process) }} /></Sect>}
          {ch.rules && <Sect title="규칙" C={C} bdr={bdr}><div style={{ fontSize: 14, color: C.text, lineHeight: 1.9 }} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(ch.rules) }} /></Sect>}
          {ch.rewards && <Sect title="보상 구조" C={C} bdr={bdr}><div style={{ fontSize: 14, color: C.text, lineHeight: 1.9 }} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(ch.rewards) }} /></Sect>}
          {ch.refund_policy && <Sect title="환불 정책" C={C} bdr={bdr}><div style={{ fontSize: 14, color: C.muted, lineHeight: 1.9 }} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(ch.refund_policy) }} /></Sect>}
          {!ch.process && !ch.rules && !ch.rewards && !ch.refund_policy && (
            <div style={{ textAlign: "center", padding: "48px 20px", color: C.muted, fontSize: 14 }}>등록된 상세 안내가 없습니다</div>
          )}
        </div>
      )}

      {/* 신청하기 탭 */}
      {dtab === "apply" && (
        <div style={{ textAlign: "center", padding: "40px 20px" }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 12 }}>지금 바로 신청하세요</div>
          <div style={{ fontSize: 14, color: C.muted, marginBottom: 24 }}>참가비를 내고 매일 미션을 수행하면 보상을 받을 수 있습니다</div>
          <button onClick={onApply} style={ctaBtn(PRIMARY)}>신청하기</button>
        </div>
      )}

      {/* 관리 탭 */}
      {dtab === "admin" && (
        <div style={{ textAlign: "center", padding: "40px 20px" }}>
          <button onClick={openAdmin} style={ctaBtn(PRIMARY)}>관리자 패널 열기</button>
        </div>
      )}
    </div>
  );
}

/* ── 필드 ── */
function Fld({ label, children, C }) {
  return <div style={{ marginBottom: 20 }}><div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 8 }}>{label}</div>{children}</div>;
}

/* ═══ ApplyForm ════════════════════════════════════════════ */
function ApplyForm({ ch, C, bdr, card, isDark, mob, user, onBack, onSubmit }) {
  const [f, sf] = useState({ name: user?.nick || "", phone: "", email: user?.email || "", sns_link: "", purpose: "", payment_method: ch.price > 0 ? "later" : "free", agree_rules: false, agree_refund: false });
  const [busy, setBusy] = useState(false);
  const [startFile, setStartFile] = useState(null);
  const [startPreview, setStartPreview] = useState("");
  const up = (k, v) => sf(p => ({ ...p, [k]: v }));
  const inp = { width: "100%", padding: "12px 16px", borderRadius: 10, border: "1px solid " + bdr, background: isDark ? "rgba(255,255,255,0.06)" : "#fff", color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
  const phoneValid = /^01[016789]-\d{3,4}-\d{4}$/.test(f.phone);
  const ok = f.name && phoneValid && f.email && f.purpose && f.agree_rules && (ch.price > 0 ? f.agree_refund : true);
  const applyStartImg = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) { alert("이미지는 5MB 이하만 업로드할 수 있습니다."); return; }
    setStartFile(file);
    setStartPreview(URL.createObjectURL(file));
  };
  const pickStartFile = e => applyStartImg(e.target.files?.[0]);

  return (
    <div style={{ background: isDark ? "transparent" : "#f9fafb", minHeight: "calc(100vh - 64px)" }}>
      <div style={{ maxWidth: 560, margin: "0 auto", padding: mob ? "24px 16px 80px" : "48px 20px 100px" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: C.muted, fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 24, display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg> 뒤로
        </button>
        <div style={{ background: card, border: "1px solid " + bdr, borderRadius: 24, padding: mob ? "28px 20px" : "40px 36px", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 6 }}>{ch.title}</h2>
          <p style={{ fontSize: 13, color: C.muted, marginBottom: 32 }}>성장 프로그램 참가 신청</p>

          <Fld label="이름 *" C={C}><input value={f.name} onChange={e => up("name", e.target.value)} placeholder="이름" style={inp} /></Fld>
          <Fld label="연락처 *" C={C}><input value={f.phone} onChange={e => {
            const v = e.target.value.replace(/[^0-9]/g, "").slice(0, 11);
            const formatted = v.length <= 3 ? v : v.length <= 7 ? v.slice(0,3) + "-" + v.slice(3) : v.slice(0,3) + "-" + v.slice(3,7) + "-" + v.slice(7);
            up("phone", formatted);
          }} placeholder="010-0000-0000" style={inp} inputMode="tel" maxLength={13} /></Fld>
          <Fld label="이메일 *" C={C}><input value={f.email} onChange={e => up("email", e.target.value)} placeholder="email@example.com" style={inp} /></Fld>
          <Fld label="SNS 계정 링크" C={C}>
            {(() => {
              const SNS_TYPES = ["블로그", "인스타그램", "유튜브", "스레드", "틱톡", "카페", "기타"];
              const links = f.sns_links || [{ type: "", url: "" }];
              const updateLinks = (nl) => sf(p => ({ ...p, sns_links: nl, sns_link: nl.map(l => l.type && l.url ? `[${l.type}] ${l.url}` : l.url).filter(Boolean).join(" | ") }));
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {links.map((link, i) => (
                    <div key={i} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <select value={link.type} onChange={e => { const nl = [...links]; nl[i] = { ...nl[i], type: e.target.value }; updateLinks(nl); }}
                        style={{ ...inp, width: 100, flex: "none", padding: "10px 8px", fontSize: 12 }}>
                        <option value="">선택</option>
                        {SNS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <input value={link.url} onChange={e => { const nl = [...links]; nl[i] = { ...nl[i], url: e.target.value }; updateLinks(nl); }}
                        placeholder="https://..." style={{ ...inp, flex: 1 }} />
                      {links.length > 1 && (
                        <button onClick={() => { const nl = links.filter((_, j) => j !== i); updateLinks(nl); }}
                          style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 14, fontWeight: 700, padding: "4px 6px", flexShrink: 0 }}>X</button>
                      )}
                    </div>
                  ))}
                  {links.length < 5 && (
                    <button onClick={() => updateLinks([...links, { type: "", url: "" }])}
                      style={{ alignSelf: "flex-start", padding: "6px 14px", borderRadius: 8, border: "1px solid " + bdr, background: "transparent", color: C.muted, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>+ 추가</button>
                  )}
                </div>
              );
            })()}
          </Fld>
          <Fld label="시작 데이터 인증 이미지" C={C}>
            <input type="file" accept="image/*" onChange={pickStartFile} style={{ display: "none" }} id="challenge-start-proof" />
            <div
              onClick={() => document.getElementById("challenge-start-proof")?.click()}
              onDrop={e => { e.preventDefault(); applyStartImg(e.dataTransfer?.files?.[0]); }}
              onDragOver={e => e.preventDefault()}
              onDragEnter={e => e.preventDefault()}
              onPaste={e => { const items = e.clipboardData?.items; if (!items) return; for (const item of items) { if (item.type.startsWith("image/")) { e.preventDefault(); applyStartImg(item.getAsFile()); return; } } }}
              tabIndex={0}
              style={{ border: `2px dashed ${startPreview ? PRIMARY : bdr}`, borderRadius: 14, padding: startPreview ? 0 : "22px 16px", textAlign: "center", cursor: "pointer", background: isDark ? "rgba(255,255,255,0.02)" : "#fafafa", overflow: "hidden", outline: "none", transition: "all 0.2s" }}>
              {startPreview ? (
                <img src={startPreview} alt="시작 인증" style={{ width: "100%", maxHeight: 260, objectFit: "cover", display: "block" }} />
              ) : (
                <>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="1.5" style={{ display: "block", margin: "0 auto 10px" }}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 6 }}>클릭, 드래그 또는 캡처 후 Ctrl+V</div>
                  <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>팔로워 수, 조회수, 방문자 수 등 현재 상태 화면</div>
                </>
              )}
            </div>
          </Fld>
          <Fld label="참여 목적 *" C={C}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {PURPOSE_OPTIONS.map(p => (
                <button key={p} onClick={() => up("purpose", p)}
                  style={{ padding: "10px 18px", borderRadius: 99, border: "1.5px solid " + (f.purpose === p ? PRIMARY : bdr), background: f.purpose === p ? "rgba(59,130,246,0.06)" : "transparent", color: f.purpose === p ? PRIMARY : C.muted, fontSize: 13, fontWeight: f.purpose === p ? 700 : 500, cursor: "pointer", fontFamily: "inherit" }}>{p}</button>
              ))}
            </div>
          </Fld>

          {ch.price > 0 && <Fld label="결제 방식" C={C}>
            <div style={{ padding: "12px", borderRadius: 10, border: "1.5px solid " + PRIMARY, background: "rgba(59,130,246,0.06)", color: PRIMARY, fontSize: 13, fontWeight: 700, textAlign: "center" }}>추후 안내</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>신청 후 별도 결제 안내를 드립니다</div>
          </Fld>}

          <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 12 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13, color: C.text }}>
              <input type="checkbox" checked={f.agree_rules} onChange={e => up("agree_rules", e.target.checked)} style={{ width: 18, height: 18, accentColor: PRIMARY }} />
              성장 프로그램 규칙에 동의합니다 <span style={{ color: "#ef4444" }}>*</span>
            </label>
            {ch.price > 0 && <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13, color: C.text }}>
              <input type="checkbox" checked={f.agree_refund} onChange={e => up("agree_refund", e.target.checked)} style={{ width: 18, height: 18, accentColor: PRIMARY }} />
              환불 정책에 동의합니다 <span style={{ color: "#ef4444" }}>*</span>
            </label>}
          </div>

          <button disabled={!ok || busy} onClick={async () => { setBusy(true); try { const start_screenshot_url = startFile ? await uploadChallengeProof(ch.id, user, startFile, "start") : ""; await onSubmit({ ...f, start_screenshot_url }); } catch(e) { alert("오류: " + e.message); } setBusy(false); }}
            style={{ width: "100%", padding: "16px", borderRadius: 99, border: "none", background: ok ? PRIMARY : (isDark ? "rgba(255,255,255,0.1)" : "#e5e7eb"), color: ok ? "#fff" : C.muted, fontSize: 16, fontWeight: 700, cursor: ok ? "pointer" : "not-allowed", marginTop: 28, opacity: busy ? 0.7 : 1, fontFamily: "inherit" }}>
            {busy ? "인증 이미지 저장 중..." : "참여하기"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProofStatus({ title, url, C, bdr, onReplace }) {
  return (
    <div style={{ border: "1px solid " + bdr, borderRadius: 12, padding: 12, background: "rgba(59,130,246,0.03)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: C.text }}>{title}</span>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {url ? <a href={url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: PRIMARY, fontWeight: 700, textDecoration: "none" }}>보기</a> : <span style={{ fontSize: 11, color: C.muted }}>미등록</span>}
          {url && onReplace && <button onClick={onReplace} style={{ border: "none", background: "transparent", color: C.muted, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", padding: 0 }}>다시 올리기</button>}
        </span>
      </div>
      {url ? (
        <img src={url} alt={title} style={{ width: "100%", height: 86, objectFit: "cover", borderRadius: 8, display: "block" }} />
      ) : (
        <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>예: 팔로워 수, 조회수, 방문자 수, 구독자 수가 보이는 화면을 이미지로 남깁니다</div>
      )}
    </div>
  );
}

function StartProofUploader({ ch, C, bdr, isDark, user, myApp, setMyApp, compact = false }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  if (!myApp?.id) return null;
  const applyImg = (f) => {
    if (!f || !f.type.startsWith("image/")) return;
    if (f.size > 5 * 1024 * 1024) { alert("이미지는 5MB 이하만 업로드할 수 있습니다."); return; }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };
  const pickFile = e => applyImg(e.target.files?.[0]);
  const onDrop = e => { e.preventDefault(); applyImg(e.dataTransfer?.files?.[0]); };
  const onDragOver = e => e.preventDefault();
  const onPaste = e => { const items = e.clipboardData?.items; if (!items) return; for (const item of items) { if (item.type.startsWith("image/")) { e.preventDefault(); applyImg(item.getAsFile()); return; } } };
  const submit = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const start_screenshot_url = await uploadChallengeProof(ch.id, user, file, "start");
      const updated = await updateApplicationProof(myApp.id, { start_screenshot_url });
      setMyApp(updated);
      setFile(null);
      setPreview("");
      setEditing(false);
    } catch (e) {
      alert("시작 인증 저장 실패: " + e.message);
    }
    setBusy(false);
  };
  return (
    <div style={{ border: "1px solid " + bdr, borderRadius: 14, padding: compact ? 12 : 16, background: isDark ? "rgba(255,255,255,0.03)" : "#fafafa", textAlign: "left" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: C.text }}>시작 데이터 인증</span>
        {myApp.start_screenshot_url ? <a href={myApp.start_screenshot_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: PRIMARY, fontWeight: 700, textDecoration: "none" }}>등록됨</a> : <span style={{ fontSize: 11, color: "#f59e0b", fontWeight: 700 }}>미등록</span>}
      </div>
      {myApp.start_screenshot_url && !file && !editing ? (
        <>
          <img src={myApp.start_screenshot_url} alt="시작 인증" style={{ width: "100%", maxHeight: compact ? 130 : 180, objectFit: "cover", borderRadius: 10, display: "block" }} />
          <button onClick={() => setEditing(true)} style={{ width: "100%", marginTop: 10, padding: "9px 12px", borderRadius: 10, border: "1px solid " + bdr, background: "transparent", color: C.muted, fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>다시 올리기</button>
        </>
      ) : (
        <>
          <input id={`start-proof-after-${myApp.id}`} type="file" accept="image/*" onChange={pickFile} style={{ display: "none" }} />
          <div onDrop={onDrop} onDragOver={onDragOver} onDragEnter={e => e.preventDefault()} onPaste={onPaste} tabIndex={0}
            onClick={() => document.getElementById(`start-proof-after-${myApp.id}`)?.click()}
            style={{ display: "block", border: `1.5px dashed ${preview ? PRIMARY : bdr}`, borderRadius: 10, padding: preview ? 0 : "16px 12px", textAlign: "center", cursor: "pointer", color: C.muted, fontSize: 12, overflow: "hidden", outline: "none", transition: "all 0.2s" }}>
            {preview ? <img src={preview} alt="시작 인증 미리보기" style={{ width: "100%", maxHeight: compact ? 130 : 180, objectFit: "cover", display: "block" }} /> : (<><div>클릭, 드래그 또는 캡처 후 Ctrl+V</div><div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>팔로워/조회수/방문자 수 화면</div></>)}
          </div>
          {file && <button disabled={busy} onClick={submit} style={{ width: "100%", marginTop: 10, padding: "10px 12px", borderRadius: 10, border: "none", background: PRIMARY, color: "#fff", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>{busy ? "저장 중..." : "시작 인증 저장"}</button>}
        </>
      )}
    </div>
  );
}

function ProofDayCell({ title, date, done, active, C, bdr, card, isDark, mob, onClick }) {
  const dow = ["일","월","화","수","목","금","토"][date.getDay()];
  return (
    <div onClick={onClick}
      style={{
        borderRadius: 14,
        padding: mob ? "10px 4px" : "12px 8px",
        textAlign: "center",
        cursor: "pointer",
        border: active ? `2px solid ${PRIMARY}` : `1px solid ${bdr}`,
        background: done ? "rgba(34,197,94,0.07)" : (isDark ? "rgba(255,255,255,0.03)" : card),
        transition: "all 0.15s",
        position: "relative",
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.transform = "translateY(-2px)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "none"; }}>
      <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{date.getMonth() + 1}/{date.getDate()} {dow}</div>
      <div style={{ fontSize: mob ? 12 : 13, fontWeight: 800, color: active ? PRIMARY : C.text, minHeight: 18 }}>{title}</div>
      <div style={{ marginTop: 6 }}>
        {done ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block", margin: "0 auto" }}><polyline points="20 6 9 17 4 12"/></svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block", margin: "0 auto", opacity: 0.75 }}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
        )}
      </div>
    </div>
  );
}

/* ═══ MissionBoard ═════════════════════════════════════════ */
function MissionBoard({ ch, C, bdr, card, isDark, mob, user, myApp, setMyApp, missions, setMissions, isParticipant, onBack }) {
  const isAdmin = user?.role === "admin";
  const [toast, setToast] = useState("");
  const showToast = msg => { setToast(msg); setTimeout(() => setToast(""), 3000); };
  const [selDay, setSelDay] = useState(null);
  const [proofPanel, setProofPanel] = useState(null);
  const [link, setLink] = useState("");
  const [memo, setMemo] = useState("");
  const [extraFile, setExtraFile] = useState(null);
  const [extraPreview, setExtraPreview] = useState("");
  const [screenshotFile, setScreenshotFile] = useState(null); // 인증 스크린샷
  const [screenshotPreview, setScreenshotPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [endProofFile, setEndProofFile] = useState(null);
  const [endProofPreview, setEndProofPreview] = useState("");
  const [endProofBusy, setEndProofBusy] = useState(false);
  const [endProofEditing, setEndProofEditing] = useState(false);
  const [dragOverDay, setDragOverDay] = useState(null); // 드래그 중인 Day 셀 하이라이트
  const boardRef = useRef(null);

  // 전역: 브라우저 기본 파일 열기 차단
  useEffect(() => {
    const prevent = e => e.preventDefault();
    window.addEventListener("dragover", prevent);
    window.addEventListener("drop", prevent);
    return () => {
      window.removeEventListener("dragover", prevent);
      window.removeEventListener("drop", prevent);
    };
  }, []);
  const [missionEditMode, setMissionEditMode] = useState(false);
  const [extraAddMode, setExtraAddMode] = useState(false); // 추가활동만 추가 모드
  const [extraCategory, setExtraCategory] = useState(null); // "comment"|"like"|"share"|"other"
  const [extraLink, setExtraLink] = useState(""); // 추가활동 SNS 링크
  const [daySubTab, setDaySubTab] = useState("my"); // "my" | "others" Day 상세 서브탭
  const fileInputRef = useRef(null);
  const extraFileInputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("calendar");
  const [expandedMember, setExpandedMember] = useState(null);
  const [viewAsMember, setViewAsMember] = useState(null); // 관리자용: 특정 멤버 미션보드 보기 { uid, nick, days, count }
  const inp = { width: "100%", padding: "12px 16px", borderRadius: 10, border: "1px solid " + bdr, background: isDark ? "rgba(255,255,255,0.06)" : "#fff", color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };

  const totalDays = parseInt(ch.duration) || 10;
  const startDate = ch.start_date ? new Date(ch.start_date) : new Date();
  const localDateOnly = dt => new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
  const currentDayNum = Math.floor((localDateOnly(new Date()) - localDateOnly(startDate)) / 86400000) + 1;
  const todayNum = Math.max(1, Math.min(totalDays, currentDayNum));
  const dayDate = d => { const dt = new Date(startDate); dt.setDate(dt.getDate() + d - 1); return dt; };
  const startProofDate = (() => { const dt = new Date(startDate); dt.setDate(dt.getDate() - 1); return dt; })();
  const endProofDate = (() => { const dt = dayDate(totalDays); dt.setDate(dt.getDate() + 1); return dt; })();
  const canUploadEndProof = isParticipant && myApp?.id;

  // 내 미션 맵 (day → mission)
  const myMissions = {};
  const allByDay = {};
  missions.forEach(m => {
    if (!allByDay[m.day]) allByDay[m.day] = [];
    allByDay[m.day].push(m);
    if (m.uid === user?.uid && !myMissions[m.day]) myMissions[m.day] = m;
  });

  const myChecked = Object.keys(myMissions).length;
  const pct = Math.round((myChecked / totalDays) * 100);
  const availableMissionCount = Math.max(0, Math.min(totalDays, currentDayNum));
  const incompleteDays = Array.from({ length: availableMissionCount }, (_, i) => i + 1).filter(d => !myMissions[d]);
  const incompleteCount = incompleteDays.length;

  // 관리자 뷰: 다른 멤버의 미션보드를 볼 때 사용
  const vM = viewAsMember ? viewAsMember.days : myMissions;
  const vChecked = viewAsMember ? viewAsMember.count : myChecked;
  const vPct = viewAsMember ? Math.round((vChecked / totalDays) * 100) : pct;
  const vScore = viewAsMember ? calcScore(viewAsMember.days) : null;
  const vIncomplete = viewAsMember ? Array.from({ length: availableMissionCount }, (_, i) => i + 1).filter(d => !vM[d]) : incompleteDays;
  const isViewing = !!viewAsMember; // 관리자가 다른 멤버를 보고 있는지

  // 스크린샷 선택 핸들러
  const applyFile = (file, target) => {
    if (!file || !file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) { alert("파일 크기는 5MB 이하만 가능합니다."); return; }
    if (target === "extra") { setExtraFile(file); setExtraPreview(URL.createObjectURL(file)); }
    else { setScreenshotFile(file); setScreenshotPreview(URL.createObjectURL(file)); }
  };
  const handleScreenshot = (e) => applyFile(e.target.files?.[0], "main");
  const handleExtraScreenshot = (e) => applyFile(e.target.files?.[0], "extra");
  const [dragTarget, setDragTarget] = useState(null);
  const dropBlockRef = useRef(false);
  const makeDragProps = (target) => ({
    onDragEnter: e => { e.preventDefault(); setDragTarget(target); },
    onDragOver: e => { e.preventDefault(); },
    onDragLeave: e => { if (!e.currentTarget.contains(e.relatedTarget)) setDragTarget(null); },
    onDrop: e => { e.preventDefault(); e.stopPropagation(); setDragTarget(null); dropBlockRef.current = true; setTimeout(() => { dropBlockRef.current = false; }, 300); applyFile(e.dataTransfer?.files?.[0], target); },
  });
  const safeClick = (fn) => (e) => { if (dropBlockRef.current) { e.preventDefault(); e.stopPropagation(); return; } fn(); };
  const handlePaste = (target) => (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        applyFile(item.getAsFile(), target);
        return;
      }
    }
  };

  // 인증 제출
  const submit = async () => {
    const existing = myMissions[selDay];
    const editing = missionEditMode && existing?.uid === user?.uid;
    if ((!link.trim() && !screenshotFile && !editing) || !selDay) return; setBusy(true);
    try {
      let screenshotUrl = null;
      if (screenshotFile) {
        setUploading(true);
        const ext = screenshotFile.name.split(".").pop();
        const path = `challenge-missions/${ch.id}/day${selDay}_${user.uid}_${Date.now()}.${ext}`;
        const { data: upData, error: upErr } = await supabase.storage.from("uploads").upload(path, screenshotFile, { contentType: screenshotFile.type, upsert: true });
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("uploads").getPublicUrl(path);
        screenshotUrl = urlData?.publicUrl || null;
        setUploading(false);
      }
      let extraUrl = null;
      if (extraFile) {
        setUploading(true);
        const extraExt = extraFile.name.split(".").pop() || "png";
        const extraPath = `challenge-missions/${ch.id}/day${selDay}_${user.uid}_extra_${Date.now()}.${extraExt}`;
        const { error: extraErr } = await supabase.storage.from("uploads").upload(extraPath, extraFile, { contentType: extraFile.type, upsert: true });
        if (extraErr) throw extraErr;
        const { data: extraData } = supabase.storage.from("uploads").getPublicUrl(extraPath);
        extraUrl = extraData?.publicUrl || null;
        setUploading(false);
      }
      const payload = { body: memo.trim(), link: link.trim() || screenshotUrl || existing?.link || "", extra_link: extraUrl || existing?.extra_link || null, screenshot_url: screenshotUrl || existing?.screenshot_url || null };
      const m = editing
        ? await updateMission(existing.id, payload)
        : await submitMission({ challenge_id: ch.id, uid: user.uid, nick: user.nick || "참가자", day: selDay, title: `Day ${selDay} 미션 인증`, ...payload });
      setMissions(p => editing ? p.map(x => x.id === m.id ? m : x) : [m, ...p]);
      setLink(""); setMemo(""); setExtraFile(null); setExtraPreview(""); setScreenshotFile(null); setScreenshotPreview(null); setMissionEditMode(false); setSelDay(null);
    } catch(e) { alert("등록 실패: " + e.message); }
    setBusy(false);
  };

  // Day 셀의 날짜 포맷
  const fmtShort = d => `${d.getMonth() + 1}/${d.getDate()}`;
  const isToday = d => d === currentDayNum;
  const isPast = d => d < currentDayNum;
  const isFuture = d => d > currentDayNum;
  const isWeekend = d => { const dt = dayDate(d); const dow = dt.getDay(); return dow === 0 || dow === 6; };
  const dayLabel = d => { const dt = dayDate(d); return ["일","월","화","수","목","금","토"][dt.getDay()]; };
  const lateDaysFor = m => {
    if (!m?.created_at || Number(m.day) <= 0) return 0;
    const submitted = new Date(m.created_at);
    const due = dayDate(Number(m.day));
    return Math.max(0, Math.floor((localDateOnly(submitted) - localDateOnly(due)) / 86400000));
  };
  const scoreForMission = (day, m) => {
    const base = isWeekend(Number(day)) ? 2 : 1;
    const bonus = getExtraLinks(m.extra_link).length * 0.5;
    const penalty = Math.min(base + bonus, lateDaysFor(m) * 0.5);
    return Math.max(0, base + bonus - penalty);
  };

  // 점수 계산: 평일 1점, 주말 2점, 추가활동 +0.5점, 날짜 지연 제출은 하루당 -0.5점
  const calcScore = (missionsByDay) => {
    let score = 0;
    Object.entries(missionsByDay).forEach(([d, m]) => {
      score += scoreForMission(d, m);
    });
    return score;
  };
  const myScore = calcScore(myMissions);
  const applyEndFile = (f) => {
    if (!f || !f.type.startsWith("image/")) return;
    if (f.size > 5 * 1024 * 1024) { alert("이미지는 5MB 이하만 업로드할 수 있습니다."); return; }
    setEndProofFile(f);
    setEndProofPreview(URL.createObjectURL(f));
  };
  const pickEndProofFile = e => applyEndFile(e.target.files?.[0]);
  const endDrop = e => { e.preventDefault(); applyEndFile(e.dataTransfer?.files?.[0]); };
  const endPaste = e => { const items = e.clipboardData?.items; if (!items) return; for (const item of items) { if (item.type.startsWith("image/")) { e.preventDefault(); applyEndFile(item.getAsFile()); return; } } };
  const submitEndProof = async () => {
    if (!endProofFile || !myApp?.id) return;
    setEndProofBusy(true);
    try {
      const end_screenshot_url = await uploadChallengeProof(ch.id, user, endProofFile, "end");
      const updated = await updateApplicationProof(myApp.id, { end_screenshot_url });
      setMyApp(updated);
      setEndProofFile(null);
      setEndProofPreview("");
      setEndProofEditing(false);
    } catch (e) {
      alert("종료 인증 저장 실패: " + e.message);
    }
    setEndProofBusy(false);
  };
  const scrollToAuthPanel = id => setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  const nextMissionDay = (() => {
    const availableCount = Math.max(0, Math.min(totalDays, currentDayNum));
    const available = incompleteDays;
    return available[0] || Math.max(1, Math.min(totalDays, currentDayNum));
  })();
  const scoreBreakdown = (day, m) => {
    if (!m) return null;
    const base = isWeekend(Number(day)) ? 2 : 1;
    const bonus = getExtraLinks(m.extra_link).length * 0.5;
    const late = lateDaysFor(m) * 0.5;
    const penalty = Math.min(base + bonus, late);
    return { base, bonus, penalty, total: Math.max(0, base + bonus - penalty) };
  };
  const beginMissionEdit = m => {
    setMissionEditMode(true);
    setLink(m.link && !m.link.includes("supabase.co/storage") ? m.link : "");
    setMemo(m.body || "");
    setScreenshotFile(null);
    setScreenshotPreview(null);
    setExtraFile(null);
    setExtraPreview("");
  };
  const openStartProof = () => {
    setTab("calendar");
    setProofPanel("start");
    setSelDay(null);
    setMissionEditMode(false);
    scrollToAuthPanel("challenge-start-proof-panel");
  };
  const openEndProof = () => {
    setTab("calendar");
    setProofPanel("end");
    setSelDay(null);
    setMissionEditMode(false);
    scrollToAuthPanel("challenge-end-proof-panel");
  };
  const openMissionProof = day => {
    setTab("calendar");
    setProofPanel(null);
    setSelDay(day);
    setMissionEditMode(false);
    scrollToAuthPanel("challenge-day-proof-panel");
  };

  return (
    <div ref={boardRef}
      onDragOver={e => e.preventDefault()}
      onDrop={e => e.preventDefault()}
      style={{ background: isDark ? "transparent" : "#f9fafb", minHeight: "calc(100vh - 64px)", position: "relative" }}>
      {toast && <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, background: PRIMARY, color: "#fff", padding: "12px 24px", borderRadius: 99, fontSize: 14, fontWeight: 700, boxShadow: "0 8px 32px rgba(59,130,246,0.3)" }}>{toast}</div>}


      <div style={{ maxWidth: 860, margin: "0 auto", padding: mob ? "24px 16px 80px" : "40px 20px 100px" }}>
        {/* 헤더 */}
        <button onClick={onBack} style={{ background: "none", border: "none", color: C.muted, fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 16, display: "flex", alignItems: "center", gap: 4, fontFamily: "inherit" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg> 성장 프로그램 상세로
        </button>
        <h2 style={{ fontSize: mob ? 20 : 24, fontWeight: 700, color: C.text, marginBottom: 4 }}>{ch.title}</h2>
        <p style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>{ch.daily_mission || "매일 미션을 수행하고 인증 링크를 등록하세요"}</p>

        {/* 관리자: 다른 멤버 보기 배너 */}
        {isViewing && (
          <div style={{ background: PRIMARY, borderRadius: 14, padding: "14px 20px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: PRIMARY, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#fff" }}>{(viewAsMember.nick || "?")[0]}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>{viewAsMember.nick}님의 미션보드</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>관리자 열람 모드</div>
              </div>
            </div>
            <button onClick={() => { setViewAsMember(null); setTab("members"); }} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.2)", background: "transparent", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>목록으로</button>
          </div>
        )}

        {/* 미니 레이스 트랙 */}
        {!isViewing && missions.filter(m => m.day > 0).length > 0 && (() => {
          const rMap = {};
          missions.forEach(m => { if (!rMap[m.uid]) rMap[m.uid] = { nick: m.nick, uid: m.uid, days: {} }; if (!rMap[m.uid].days[m.day]) rMap[m.uid].days[m.day] = m; });
          const runners = Object.values(rMap).sort((a, b) => calcScore(b.days) - calcScore(a.days)).slice(0, 20);
          const topScore = Math.max(...runners.map(r => calcScore(r.days)), 1);
          const medalC = { 1: "#f59e0b", 2: "#94a3b8", 3: "#cd7f32" };
          let prevS = -1, prevR = 0;
          return (
            <div style={{ background: card, border: "1px solid " + bdr, borderRadius: 16, padding: mob ? "16px 14px" : "20px 22px", marginBottom: 20, overflow: "visible" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: C.text }}>레이스 현황</span>
                <span style={{ fontSize: 11, color: C.muted }}>🏁 {topScore}점</span>
              </div>
              <div style={{ position: "relative", height: 80, borderRadius: 14, background: isDark ? "rgba(255,255,255,0.02)" : "#f8faf8", border: "1px solid " + bdr }}>
                <div style={{ position: "absolute", bottom: 8, left: 0, right: 0, height: 3, borderRadius: 2, background: isDark ? "rgba(255,255,255,0.06)" : "#e5e7eb" }} />
                {[25, 50, 75].map(p => <div key={p} style={{ position: "absolute", left: `${p}%`, bottom: 0, height: 14, width: 1, borderLeft: "1px dashed " + (isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)") }} />)}
                <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 3, background: "#22c55e", borderRadius: "0 14px 14px 0" }} />
                <div style={{ position: "absolute", right: 6, top: 8, fontSize: 18 }}>🏁</div>
                {runners.map((r, i) => {
                  const sc = calcScore(r.days);
                  const rank = sc === prevS ? prevR : i + 1; prevS = sc; prevR = rank;
                  const pct = Math.max(2, (sc / topScore) * 82);
                  return (
                    <div key={r.uid} className={sc > 0 ? "run-anim" : ""} style={{ position: "absolute", left: `calc(${pct}% - 16px)`, bottom: 10, transition: "left 1s ease", zIndex: runners.length - i }}>
                      <RunnerChar nick={r.nick} color={medalC[rank] || PRIMARY} running={sc > 0} size={42} />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* 진행률 바 */}
        <div style={{ background: card, border: "1px solid " + bdr, borderRadius: 16, padding: "20px 22px", marginBottom: 24, boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{isViewing ? `${viewAsMember.nick}의 진행률` : "내 진행률"}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 12, color: "#f59e0b", fontWeight: 700 }}>{isViewing ? vScore : myScore}점</span>
              {vIncomplete.length > 0 && <span style={{ fontSize: 12, color: "#ef4444", fontWeight: 800 }}>미완료 {vIncomplete.length}개</span>}
              <span style={{ fontSize: 14, fontWeight: 700, color: PRIMARY }}>{vChecked}/{totalDays}일 ({vPct}%)</span>
            </div>
          </div>
          <div style={{ width: "100%", height: 8, borderRadius: 99, background: isDark ? "rgba(255,255,255,0.06)" : "#e5e7eb", overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: 99, background: PRIMARY, width: `${vPct}%`, transition: "width 0.4s ease" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 11, color: C.muted }}>
            <span>Day 1</span>
            <span>현재 Day {todayNum}</span>
            <span>Day {totalDays}</span>
          </div>
        </div>

        {/* 관리자 분석 지표 */}
        {isViewing && (() => {
          const days = viewAsMember.days;
          const doneList = Object.entries(days).sort(([a],[b]) => Number(a) - Number(b));
          let maxStreak = 0, curStreak = 0;
          for (let d = 1; d <= currentDayNum; d++) {
            if (days[d]) { curStreak++; if (curStreak > maxStreak) maxStreak = curStreak; } else curStreak = 0;
          }
          let currentStreak = 0;
          for (let d = currentDayNum; d >= 1; d--) {
            if (days[d]) currentStreak++; else break;
          }
          const lateCount = doneList.filter(([,m]) => lateDaysFor(m) > 0).length;
          const latePct = doneList.length > 0 ? Math.round((lateCount / doneList.length) * 100) : 0;
          const extraCount = doneList.filter(([,m]) => hasExtra(m)).length;
          const extraPct = doneList.length > 0 ? Math.round((extraCount / doneList.length) * 100) : 0;
          const hourBuckets = Array(24).fill(0);
          doneList.forEach(([,m]) => { if (m.created_at) hourBuckets[new Date(m.created_at).getHours()]++; });
          const maxHourVal = Math.max(...hourBuckets, 1);
          const weekScores = [];
          for (let w = 0; w < Math.ceil(totalDays / 7); w++) {
            let ws = 0;
            for (let d = w * 7 + 1; d <= Math.min((w + 1) * 7, totalDays); d++) {
              if (days[d]) ws += scoreForMission(d, days[d]);
            }
            weekScores.push(ws);
          }
          const maxWeekScore = Math.max(...weekScores, 1);
          const cumScores = [];
          let cum = 0;
          for (let d = 1; d <= Math.min(totalDays, currentDayNum); d++) {
            if (days[d]) cum += scoreForMission(d, days[d]);
            cumScores.push(cum);
          }
          const maxCum = Math.max(cum, 1);
          const statCard = (label, value, sub, color) => (
            <div style={{ flex: 1, minWidth: mob ? 130 : 150, background: card, border: "1px solid " + bdr, borderRadius: 14, padding: "16px 18px" }}>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>{label}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color }}>{value}</div>
              {sub && <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{sub}</div>}
            </div>
          );
          return (
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
                {statCard("현재 연속 인증", `${currentStreak}일`, `최대 ${maxStreak}일`, "#22c55e")}
                {statCard("추가활동 비율", `${extraPct}%`, `${extraCount}/${doneList.length}회`, "#f59e0b")}
                {statCard("지연 인증 비율", `${latePct}%`, `${lateCount}회 지연`, latePct > 30 ? "#ef4444" : "#22c55e")}
                {statCard("일평균 점수", doneList.length > 0 ? (cum / Math.min(currentDayNum, totalDays)).toFixed(1) : "0", `총 ${cum}점`, PRIMARY)}
              </div>
              <div style={{ background: card, border: "1px solid " + bdr, borderRadius: 14, padding: "18px 20px", marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12 }}>누적 점수 추이</div>
                {cumScores.length > 0 ? (
                  <svg width="100%" height="120" viewBox={`0 0 ${Math.max(cumScores.length * 20, 40)} 120`} preserveAspectRatio="none" style={{ display: "block" }}>
                    <defs><linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={PRIMARY} stopOpacity="0.3"/><stop offset="100%" stopColor={PRIMARY} stopOpacity="0.02"/></linearGradient></defs>
                    <path d={`M0,120 ${cumScores.map((s, i) => `L${i * 20},${120 - (s / maxCum) * 100}`).join(" ")} L${(cumScores.length - 1) * 20},120 Z`} fill="url(#cumGrad)" />
                    <polyline fill="none" stroke={PRIMARY} strokeWidth="2" points={cumScores.map((s, i) => `${i * 20},${120 - (s / maxCum) * 100}`).join(" ")} />
                    {cumScores.map((s, i) => days[i + 1] ? <circle key={i} cx={i * 20} cy={120 - (s / maxCum) * 100} r="3" fill={PRIMARY} /> : null)}
                  </svg>
                ) : <div style={{ fontSize: 12, color: C.muted, textAlign: "center", padding: 20 }}>데이터 없음</div>}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.muted, marginTop: 4 }}>
                  <span>Day 1</span><span>Day {cumScores.length || 1}</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, marginBottom: 12, flexDirection: mob ? "column" : "row" }}>
                <div style={{ flex: 1, background: card, border: "1px solid " + bdr, borderRadius: 14, padding: "18px 20px" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12 }}>주간 점수</div>
                  <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 80 }}>
                    {weekScores.map((ws, i) => (
                      <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: ws > 0 ? PRIMARY : C.muted }}>{ws > 0 ? ws.toFixed(1) : ""}</div>
                        <div style={{ width: "100%", maxWidth: 32, height: `${Math.max(4, (ws / maxWeekScore) * 60)}px`, borderRadius: 4, background: ws > 0 ? PRIMARY : (isDark ? "rgba(255,255,255,0.06)" : "#e5e7eb"), transition: "height 0.3s" }} />
                        <div style={{ fontSize: 9, color: C.muted }}>{i + 1}주</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ flex: 1, background: card, border: "1px solid " + bdr, borderRadius: 14, padding: "18px 20px" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12 }}>인증 시간대</div>
                  <div style={{ display: "flex", gap: 1, alignItems: "flex-end", height: 80 }}>
                    {hourBuckets.map((cnt, h) => (
                      <div key={h} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                        <div style={{ width: "100%", height: `${Math.max(2, (cnt / maxHourVal) * 60)}px`, borderRadius: 2, background: cnt > 0 ? (h < 6 ? "#8b5cf6" : h < 12 ? "#f59e0b" : h < 18 ? "#22c55e" : "#3b82f6") : (isDark ? "rgba(255,255,255,0.04)" : "#f3f4f6"), transition: "height 0.3s" }} />
                        {h % 6 === 0 && <div style={{ fontSize: 8, color: C.muted }}>{h}시</div>}
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 12, marginTop: 8, fontSize: 10, color: C.muted }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 3 }}><span style={{ width: 6, height: 6, borderRadius: 2, background: "#8b5cf6" }} />새벽</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 3 }}><span style={{ width: 6, height: 6, borderRadius: 2, background: "#f59e0b" }} />오전</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 3 }}><span style={{ width: 6, height: 6, borderRadius: 2, background: "#22c55e" }} />오후</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 3 }}><span style={{ width: 6, height: 6, borderRadius: 2, background: "#3b82f6" }} />저녁</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {isParticipant && !isViewing && (
          <div style={{ background: card, border: "1px solid " + bdr, borderRadius: 16, padding: mob ? "16px" : "18px 20px", marginBottom: 24, boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
            <div style={{ display: "flex", alignItems: mob ? "stretch" : "center", justifyContent: "space-between", gap: 12, flexDirection: mob ? "column" : "row" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: C.text, marginBottom: 4 }}>빠른 인증</div>
                <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>캘린더를 끝까지 찾지 않아도 바로 업로드할 수 있습니다. {incompleteCount > 0 ? `현재 미완료 ${incompleteCount}개` : "현재까지 미완료 없음"}</div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={openStartProof} style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid " + bdr, background: myApp?.start_screenshot_url ? "rgba(34,197,94,0.08)" : (isDark ? "rgba(255,255,255,0.04)" : "#fff"), color: myApp?.start_screenshot_url ? "#16a34a" : C.text, fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>시작 데이터</button>
                <button onClick={() => openMissionProof(nextMissionDay)} style={{ padding: "10px 16px", borderRadius: 10, border: "none", background: PRIMARY, color: "#fff", fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>오늘/미완료 인증</button>
                <button onClick={openEndProof} style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid " + bdr, background: myApp?.end_screenshot_url ? "rgba(34,197,94,0.08)" : (isDark ? "rgba(255,255,255,0.04)" : "#fff"), color: myApp?.end_screenshot_url ? "#16a34a" : C.text, fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>마지막 데이터</button>
              </div>
            </div>
            <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 10, background: isDark ? "rgba(59,130,246,0.08)" : "rgba(59,130,246,0.06)", fontSize: 12, color: C.muted, lineHeight: 1.55 }}>
              캡처 예시: 인스타 프로필 팔로워 수, 릴스/게시물 조회수, 블로그 방문자 수, 유튜브 구독자 수처럼 숫자가 보이는 화면
            </div>
          </div>
        )}

        {/* 탭 */}
        <div style={{ display: "flex", gap: 0, marginBottom: 24, borderBottom: "1px solid " + bdr }}>
          {[["calendar", "날짜별 체크"], ["members", "참가자 현황"], ["feed", "전체 피드"], ["my", isViewing ? `${viewAsMember.nick} 기록` : "내 기록"], ["board", "자유게시판"]].map(([v, l]) => (
            <button key={v} onClick={() => { setTab(v); if (v === "members") setViewAsMember(null); }} style={{ padding: "12px 20px", border: "none", cursor: "pointer", fontSize: 14, fontWeight: tab === v ? 700 : 500, background: "transparent", color: tab === v ? PRIMARY : C.muted, borderBottom: tab === v ? `2px solid ${PRIMARY}` : "2px solid transparent", marginBottom: -1, fontFamily: "inherit", transition: "all 0.15s" }}>{l}</button>
          ))}
        </div>

        {/* ── 탭: 날짜별 캘린더 체크 ── */}
        {tab === "calendar" && (
          <div>
            {/* 드래그 안내 */}
            {isParticipant && !isViewing && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, padding: "8px 14px", borderRadius: 10, background: isDark ? "rgba(59,130,246,0.06)" : "rgba(59,130,246,0.04)", border: "1px solid rgba(59,130,246,0.1)" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={PRIMARY} strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                <span style={{ fontSize: 12, color: C.muted }}>Day 셀에 <strong style={{ color: C.text }}>이미지를 드래그해서 놓거나</strong>, 클릭 후 <strong style={{ color: C.text }}>Ctrl+V로 붙여넣기</strong>하면 바로 인증됩니다</span>
              </div>
            )}
            {/* Day 그리드 */}
            <div style={{ display: "grid", gridTemplateColumns: mob ? "repeat(5, 1fr)" : "repeat(7, 1fr)", gap: 8, marginBottom: 24 }}>
              {isParticipant && !isViewing && (
                <ProofDayCell
                  title="시작 인증"
                  date={startProofDate}
                  done={!!myApp?.start_screenshot_url}
                  active={proofPanel === "start"}
                  C={C}
                  bdr={bdr}
                  card={card}
                  isDark={isDark}
                  mob={mob}
                  onClick={() => { setProofPanel(proofPanel === "start" ? null : "start"); setSelDay(null); setMissionEditMode(false); }}
                />
              )}
              {Array.from({ length: totalDays }, (_, i) => i + 1).map(d => {
                const checked = !!vM[d];
                const today = isToday(d);
                const past = isPast(d);
                const missed = past && !checked && !isWeekend(d); // 주말 미인증은 miss 아님
                const weekendMissed = past && !checked && isWeekend(d);
                const dt = dayDate(d);
                const allCount = (allByDay[d] || []).length;
                const wknd = isWeekend(d);
                return (
                  <div key={d}
                    onClick={() => { setSelDay(selDay === d ? null : d); setProofPanel(null); setMissionEditMode(false); setExtraAddMode(false); setDaySubTab("my"); }}
                    onDragOver={e => { e.preventDefault(); setDragOverDay(d); }}
                    onDragEnter={e => { e.preventDefault(); setDragOverDay(d); }}
                    onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOverDay(null); }}
                    onDrop={e => {
                      e.preventDefault(); setDragOverDay(null);
                      const file = e.dataTransfer?.files?.[0];
                      if (file && file.type.startsWith("image/") && d <= currentDayNum && isParticipant) {
                        setSelDay(d); setProofPanel(null); setMissionEditMode(false);
                        applyFile(file, "main");
                        setTimeout(() => document.getElementById("challenge-day-proof-panel")?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
                      }
                    }}
                    style={{
                      borderRadius: 14, padding: mob ? "10px 4px" : "12px 8px", textAlign: "center", cursor: "pointer",
                      border: dragOverDay === d ? `2px solid ${PRIMARY}` : selDay === d ? `2px solid ${PRIMARY}` : today ? `2px solid ${PRIMARY}40` : `1px solid ${bdr}`,
                      background: dragOverDay === d ? "rgba(59,130,246,0.15)" : checked && wknd ? "rgba(245,158,11,0.08)" : checked ? "rgba(59,130,246,0.06)" : missed ? "rgba(239,68,68,0.04)" : wknd ? (isDark ? "rgba(245,158,11,0.03)" : "rgba(245,158,11,0.03)") : card,
                      transition: "all 0.15s", position: "relative",
                      transform: dragOverDay === d ? "scale(1.05)" : undefined,
                    }}
                    onMouseEnter={e => { if (selDay !== d) e.currentTarget.style.transform = "translateY(-2px)"; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = "none"; }}>
                    {wknd && <div style={{ position: "absolute", top: 4, right: 4, fontSize: 8, fontWeight: 800, color: "#f59e0b", background: "rgba(245,158,11,0.12)", padding: "1px 5px", borderRadius: 4 }}>x2</div>}
                    <div style={{ fontSize: 11, color: wknd ? "#f59e0b" : C.muted, marginBottom: 4 }}>{fmtShort(dt)} {dayLabel(d)}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: today ? PRIMARY : C.text }}>Day {d}</div>
                    {/* 체크 상태 */}
                    <div style={{ marginTop: 6 }}>
                      {checked ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block", margin: "0 auto" }}><polyline points="20 6 9 17 4 12"/></svg>
                      ) : missed ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" style={{ display: "block", margin: "0 auto", opacity: 0.5 }}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      ) : (
                        <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${bdr}`, margin: "0 auto" }} />
                      )}
                    </div>
                    {allCount > 0 && <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>{allCount}명</div>}
                  </div>
                );
              })}
              {isParticipant && !isViewing && (
                <ProofDayCell
                  title="종료 인증"
                  date={endProofDate}
                  done={!!myApp?.end_screenshot_url}
                  active={proofPanel === "end"}
                  C={C}
                  bdr={bdr}
                  card={card}
                  isDark={isDark}
                  mob={mob}
                  onClick={() => { setProofPanel(proofPanel === "end" ? null : "end"); setSelDay(null); setMissionEditMode(false); }}
                />
              )}
            </div>

            {proofPanel === "start" && (
              <div id="challenge-start-proof-panel" style={{ background: card, border: "1px solid " + bdr, borderRadius: 20, padding: mob ? "20px 16px" : "28px 24px", boxShadow: "0 1px 2px rgba(0,0,0,0.04)", marginBottom: 24, scrollMarginTop: 90 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>시작 전 데이터 인증</div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{startProofDate.toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" })}</div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 6, lineHeight: 1.5 }}>예: 팔로워 수, 조회수, 방문자 수, 구독자 수가 보이는 화면</div>
                  </div>
                  <button onClick={() => { setProofPanel(null); setMissionEditMode(false); }} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 18 }}>x</button>
                </div>
                <StartProofUploader ch={ch} C={C} bdr={bdr} isDark={isDark} user={user} myApp={myApp} setMyApp={setMyApp} />
              </div>
            )}

            {proofPanel === "end" && (
              <div id="challenge-end-proof-panel" style={{ background: card, border: "1px solid " + bdr, borderRadius: 20, padding: mob ? "20px 16px" : "28px 24px", boxShadow: "0 1px 2px rgba(0,0,0,0.04)", marginBottom: 24, scrollMarginTop: 90 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>종료 다음날 데이터 인증</div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{endProofDate.toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" })}</div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 6, lineHeight: 1.5 }}>예: 성장 프로그램 후 늘어난 팔로워 수, 조회수, 방문자 수가 보이는 화면</div>
                  </div>
                  <button onClick={() => { setProofPanel(null); setEndProofEditing(false); }} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 18 }}>x</button>
                </div>
                {myApp?.end_screenshot_url && !endProofEditing ? (
                  <ProofStatus title="종료 인증" url={myApp.end_screenshot_url} C={C} bdr={bdr} onReplace={() => setEndProofEditing(true)} />
                ) : canUploadEndProof ? (
                  <div>
                    <input id="challenge-end-proof" type="file" accept="image/*" onChange={pickEndProofFile} style={{ display: "none" }} />
                    <div onDrop={e => { e.preventDefault(); applyEndFile(e.dataTransfer?.files?.[0]); }} onDragOver={e => e.preventDefault()} onDragEnter={e => e.preventDefault()} onPaste={endPaste} tabIndex={0}
                      onClick={() => document.getElementById("challenge-end-proof")?.click()}
                      style={{ display: "block", border: `1.5px dashed ${endProofPreview ? PRIMARY : bdr}`, borderRadius: 12, padding: endProofPreview ? 0 : "22px 16px", textAlign: "center", cursor: "pointer", overflow: "hidden", fontSize: 13, color: C.muted, background: isDark ? "rgba(255,255,255,0.02)" : "#fafafa", outline: "none", transition: "all 0.2s" }}>
                      {endProofPreview ? <img src={endProofPreview} alt="종료 인증 미리보기" style={{ width: "100%", maxHeight: 240, objectFit: "cover", display: "block" }} /> : (<><div>클릭, 드래그 또는 캡처 후 Ctrl+V</div><div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>마지막 팔로워/조회수/방문자 수 화면</div></>)}
                    </div>
                    {endProofFile && <button disabled={endProofBusy} onClick={submitEndProof} style={{ width: "100%", marginTop: 10, padding: "12px 14px", borderRadius: 10, border: "none", background: PRIMARY, color: "#fff", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>{endProofBusy ? "저장 중..." : "종료 인증 저장"}</button>}
                  </div>
                ) : null}
              </div>
            )}

            {/* 선택된 Day 상세 + 링크 등록 */}
            {selDay && (
              <div id="challenge-day-proof-panel" style={{ background: card, border: "1px solid " + bdr, borderRadius: 20, padding: mob ? "20px 16px" : "28px 24px", boxShadow: "0 1px 2px rgba(0,0,0,0.04)", marginBottom: 24, scrollMarginTop: 90 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: PRIMARY, background: "rgba(59,130,246,0.08)", padding: "5px 14px", borderRadius: 99 }}>Day {selDay}</span>
                    <span style={{ fontSize: 13, color: C.muted }}>{dayDate(selDay).toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" })}</span>
                  </div>
                  <button onClick={() => { setSelDay(null); setMissionEditMode(false); }} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 18 }}>x</button>
                </div>
                {/* 서브 탭 */}
                <div style={{ display: "flex", gap: 0, marginBottom: 16, borderBottom: "1px solid " + bdr }}>
                  {[["my", "내 인증"], ["dayExtra", "추가활동"], ["others", `참가자 (${(allByDay[selDay] || []).length}명)`]].map(([id, label]) => (
                    <button key={id} onClick={() => setDaySubTab(id)} style={{ padding: "8px 18px", border: "none", cursor: "pointer", fontSize: 13, fontWeight: daySubTab === id ? 700 : 500, background: "transparent", color: daySubTab === id ? PRIMARY : C.muted, borderBottom: daySubTab === id ? `2px solid ${PRIMARY}` : "2px solid transparent", marginBottom: -1, fontFamily: "inherit" }}>{label}</button>
                  ))}
                </div>

                {daySubTab === "my" && (<>
                {/* 인증 상태 */}
                {vM[selDay] && (!missionEditMode || isViewing) ? (
                  <div style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)", borderRadius: 12, padding: "14px 18px", marginBottom: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "#22c55e" }}>인증 완료</span>
                      {lateDaysFor(vM[selDay]) > 0 && <span style={{ fontSize: 11, fontWeight: 800, color: "#ef4444", background: "rgba(239,68,68,0.1)", padding: "2px 8px", borderRadius: 99 }}>지연 -{lateDaysFor(vM[selDay]) * 0.5}점</span>}
                      <span style={{ fontSize: 11, fontWeight: 800, color: PRIMARY, background: "rgba(59,130,246,0.08)", padding: "2px 8px", borderRadius: 99 }}>{scoreForMission(selDay, vM[selDay])}점</span>
                      <span style={{ fontSize: 11, color: C.muted, marginLeft: "auto" }}>{new Date(vM[selDay].created_at).toLocaleString("ko-KR")}</span>
                    </div>
                    {vM[selDay].link && <a href={vM[selDay].link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: PRIMARY, wordBreak: "break-all" }}>{vM[selDay].link}</a>}
                    {vM[selDay].body && <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>{vM[selDay].body}</div>}
                    {vM[selDay].screenshot_url && <img src={vM[selDay].screenshot_url} alt="인증" style={{ marginTop: 8, maxWidth: "100%", maxHeight: 300, objectFit: "contain", borderRadius: 10, display: "block", border: "1px solid " + bdr }} />}
                    {hasExtra(vM[selDay]) && (
                      <div style={{ marginTop: 10 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#f59e0b", marginBottom: 6 }}>추가활동 ({getExtraLinks(vM[selDay].extra_link).length}개, +{getExtraLinks(vM[selDay].extra_link).length * 0.5}점)</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {getExtraLinks(vM[selDay].extra_link).map((item, i) => {
                            const catLabels = { comment: "댓글", like: "좋아요", share: "공유", other: "기타" };
                            return (
                              <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 10px", borderRadius: 8, background: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.1)" }}>
                                <a href={extraImg(item)} target="_blank" rel="noopener noreferrer"><img src={extraImg(item)} alt={`추가활동 ${i + 1}`} style={{ width: 70, height: 50, objectFit: "cover", borderRadius: 6, display: "block", flexShrink: 0 }} /></a>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    {extraCat(item) && <span style={{ fontSize: 10, fontWeight: 700, color: "#f59e0b", background: "rgba(245,158,11,0.12)", padding: "1px 8px", borderRadius: 99 }}>{catLabels[extraCat(item)] || extraCat(item)}</span>}
                                    <span style={{ fontSize: 10, color: C.muted }}>+0.5점</span>
                                  </div>
                                  {extraUrl(item) && <a href={extraUrl(item)} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: PRIMARY, textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block", marginTop: 2 }}>{extraUrl(item)}</a>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {(() => { const s = scoreBreakdown(selDay, vM[selDay]); return s ? <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10, fontSize: 11 }}><span style={{ color: C.muted }}>기본 {s.base}점</span>{s.bonus > 0 && <span style={{ color: "#f59e0b" }}>추가 +{s.bonus}점</span>}{s.penalty > 0 && <span style={{ color: "#ef4444" }}>지연 -{s.penalty}점</span>}<span style={{ color: PRIMARY, fontWeight: 800 }}>총 {s.total}점</span></div> : null; })()}
                    {!isViewing && (
                      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                        <button onClick={() => { setExtraAddMode(true); setExtraFile(null); setExtraPreview(""); }} style={{ padding: "8px 14px", borderRadius: 10, border: "none", background: "rgba(245,158,11,0.1)", color: "#f59e0b", fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>{hasExtra(vM[selDay]) ? "추가활동 더 올리기" : "추가활동 올리기 (+0.5점)"}</button>
                        <button onClick={() => beginMissionEdit(vM[selDay])} style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid " + bdr, background: "transparent", color: C.muted, fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>전체 다시 올리기</button>
                        {isAdmin && <button onClick={async () => { if (!confirm(`Day ${selDay} 인증을 삭제하시겠습니까?`)) return; await supabase.from("challenge_missions").delete().eq("id", vM[selDay].id); setMissions(p => p.filter(x => x.id !== vM[selDay].id)); setSelDay(null); showToast("인증이 삭제되었습니다"); }} style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid rgba(239,68,68,0.3)", background: "transparent", color: "#ef4444", fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>삭제</button>}
                      </div>
                    )}
                    {/* 추가활동만 추가 모드 */}
                    {extraAddMode && !isViewing && (
                      <div style={{ marginTop: 12, padding: "14px 16px", borderRadius: 12, background: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.15)" }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#f59e0b", marginBottom: 10 }}>추가활동 인증 (각 +0.5점)</div>
                        {/* 카테고리 선택 */}
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                          {[["comment","댓글"],["like","좋아요"],["share","공유/리포스트"],["other","기타"]].map(([id,label]) => (
                            <button key={id} onClick={() => setExtraCategory(id)}
                              style={{ padding: "7px 14px", borderRadius: 99, border: extraCategory === id ? "none" : "1px solid " + bdr, background: extraCategory === id ? "#f59e0b" : "transparent", color: extraCategory === id ? "#fff" : C.text, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                              {label}
                            </button>
                          ))}
                        </div>
                        {extraCategory && (<>
                        <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>
                          {extraCategory === "comment" && "댓글을 남긴 화면을 캡처해주세요"}
                          {extraCategory === "like" && "좋아요를 누른 화면을 캡처해주세요"}
                          {extraCategory === "share" && "공유/리포스트한 화면을 캡처해주세요"}
                          {extraCategory === "other" && "기타 추가활동 화면을 캡처해주세요"}
                        </div>
                        <input value={extraLink} onChange={e => setExtraLink(e.target.value)} placeholder="인증 SNS 링크 (선택)" style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid " + bdr, background: isDark ? "rgba(255,255,255,0.06)" : "#fff", color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit", marginBottom: 8 }} />
                        <input ref={extraFileInputRef} type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) { setExtraFile(f); const r = new FileReader(); r.onload = ev => setExtraPreview(ev.target.result); r.readAsDataURL(f); } }} style={{ display: "none" }} />
                        <div onClick={() => extraFileInputRef.current?.click()}
                          {...makeDragProps("extra")} onPaste={handlePaste("extra")} tabIndex={0}
                          style={{ border: `1.5px dashed ${extraPreview ? "#f59e0b" : bdr}`, borderRadius: 10, padding: extraPreview ? 0 : "14px 12px", textAlign: "center", cursor: "pointer", background: isDark ? "rgba(245,158,11,0.04)" : "rgba(245,158,11,0.03)", overflow: "hidden", outline: "none" }}>
                          {extraPreview ? (
                            <div style={{ position: "relative" }}>
                              <img src={extraPreview} alt="추가활동" style={{ width: "100%", maxHeight: 160, objectFit: "cover", display: "block" }} />
                              <button onClick={e => { e.stopPropagation(); setExtraFile(null); setExtraPreview(""); }} style={{ position: "absolute", top: 6, right: 6, width: 22, height: 22, borderRadius: "50%", background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>x</button>
                            </div>
                          ) : (
                            <div style={{ fontSize: 12, color: C.muted }}>{{"comment":"댓글","like":"좋아요","share":"공유","other":"기타"}[extraCategory]} 스크린샷</div>
                          )}
                        </div>
                        </>)}
                        {extraCategory && <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                          <button disabled={!extraFile || !extraCategory || busy} onClick={async () => {
                            if (!extraFile || !vM[selDay]) return;
                            setBusy(true);
                            try {
                              const ext = extraFile.name.split(".").pop();
                              const path = `challenge/${ch.id}/${user.uid}/extra_${selDay}_${Date.now()}.${ext}`;
                              const { error: upErr } = await supabase.storage.from("uploads").upload(path, extraFile, { upsert: true });
                              if (upErr) throw upErr;
                              const { data: { publicUrl } } = supabase.storage.from("uploads").getPublicUrl(path);
                              const existing = getExtraLinks(vM[selDay].extra_link);
                              const newEntry = { img: publicUrl, cat: extraCategory, link: extraLink.trim() || null };
                              const updated = JSON.stringify([...existing, newEntry]);
                              await supabase.from("challenge_missions").update({ extra_link: updated }).eq("id", vM[selDay].id);
                              setMissions(prev => prev.map(m => m.id === vM[selDay].id ? { ...m, extra_link: updated } : m));
                              setExtraAddMode(false); setExtraFile(null); setExtraPreview(""); setExtraCategory(null); setExtraLink("");
                              showToast(`추가활동이 등록되었습니다! (${existing.length + 1}개, +${(existing.length + 1) * 0.5}점)`);
                            } catch (e) { alert("업로드 실패: " + e.message); }
                            setBusy(false);
                          }} style={{ flex: 1, padding: "10px", borderRadius: 10, border: "none", background: extraFile ? "#f59e0b" : (isDark ? "rgba(255,255,255,0.1)" : "#e5e7eb"), color: extraFile ? "#fff" : C.muted, fontSize: 13, fontWeight: 700, cursor: extraFile ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
                            {busy ? "저장 중..." : "추가활동 저장"}
                          </button>
                          <button onClick={() => { setExtraAddMode(false); setExtraFile(null); setExtraPreview(""); setExtraCategory(null); setExtraLink(""); }} style={{ padding: "10px 16px", borderRadius: 10, border: "1px solid " + bdr, background: "transparent", color: C.muted, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>취소</button>
                        </div>}
                      </div>
                    )}
                  </div>
                ) : !isViewing && (selDay <= currentDayNum && user && isParticipant) ? (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{missionEditMode ? "인증 다시 올리기" : "인증 링크 등록"}</span>
                      {isWeekend(selDay) && <span style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b", background: "rgba(245,158,11,0.1)", padding: "2px 8px", borderRadius: 99 }}>주말 보너스 x2</span>}
                    </div>
                    <input value={link} onChange={e => setLink(e.target.value)} placeholder="블로그 글, 인스타 포스팅 URL 등" style={{ ...inp, marginBottom: 4 }} />
                    <div style={{ fontSize: 11, color: selDay && lateDaysFor({ created_at: new Date().toISOString(), day: selDay }) > 0 ? "#ef4444" : "#22c55e", fontWeight: 700, marginBottom: 8, padding: "4px 0" }}>
                      Day {selDay} 해당 날짜: {selDay && dayDate(selDay).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "short" })}
                      {selDay && lateDaysFor({ created_at: new Date().toISOString(), day: selDay }) > 0
                        ? ` (${lateDaysFor({ created_at: new Date().toISOString(), day: selDay })}일 지연 — 해당 날짜에 작성한 글인지 확인해주세요)`
                        : " (오늘 해당)"}
                    </div>

                    {/* 스크린샷 업로드 — 클릭/드래그/붙여넣기 */}
                    <div style={{ marginBottom: 8 }}>
                      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleScreenshot} style={{ display: "none" }} />
                      <div onClick={safeClick(() => fileInputRef.current?.click())}
                        {...makeDragProps("main")} onPaste={handlePaste("main")} tabIndex={0}
                        style={{ border: `2px dashed ${dragTarget === "main" ? PRIMARY : screenshotPreview ? PRIMARY : bdr}`, borderRadius: 12, padding: screenshotPreview ? 0 : "20px 16px", textAlign: "center", cursor: "pointer", background: dragTarget === "main" ? (isDark ? "rgba(59,130,246,0.08)" : "rgba(59,130,246,0.06)") : (isDark ? "rgba(255,255,255,0.02)" : "#fafafa"), overflow: "hidden", transition: "all 0.2s", outline: "none" }}>
                        {screenshotPreview ? (
                          <div style={{ position: "relative" }}>
                            <img src={screenshotPreview} alt="preview" style={{ width: "100%", maxHeight: 200, objectFit: "cover", display: "block" }} />
                            <button onClick={e => { e.stopPropagation(); setScreenshotFile(null); setScreenshotPreview(null); }} style={{ position: "absolute", top: 8, right: 8, width: 24, height: 24, borderRadius: "50%", background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>x</button>
                          </div>
                        ) : (
                          <>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="1.5" style={{ display: "block", margin: "0 auto 8px" }}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                            <div style={{ fontSize: 13, color: C.muted, marginBottom: 4 }}>클릭, 드래그 또는 캡처 후 Ctrl+V로 바로 붙여넣기</div>
                            <div style={{ fontSize: 11, color: C.muted, opacity: 0.6 }}>선택, 최대 5MB</div>
                          </>
                        )}
                      </div>
                    </div>

                    <input value={memo} onChange={e => setMemo(e.target.value)} placeholder="메모 (선택)" style={{ ...inp, marginBottom: 8 }} />
                    {/* 예상 점수 미리보기 */}
                    {(() => {
                      const base = isWeekend(selDay) ? 2 : 1;
                      const expectedScore = base;
                      return (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, padding: "10px 14px", borderRadius: 10, background: isDark ? "rgba(59,130,246,0.06)" : "rgba(59,130,246,0.04)", border: "1px solid rgba(59,130,246,0.1)" }}>
                          <span style={{ fontSize: 12, color: C.muted }}>이번 인증</span>
                          <span style={{ fontSize: 14, fontWeight: 800, color: PRIMARY }}>+{expectedScore}점</span>
                          <span style={{ fontSize: 11, color: C.muted }}>({isWeekend(selDay) ? "주말 2점" : "평일 1점"}) · 인증 후 추가활동 가산</span>
                          <span style={{ marginLeft: "auto", fontSize: 12, color: "#f59e0b", fontWeight: 700 }}>현재 {myScore}점 / {myChecked}일</span>
                        </div>
                      );
                    })()}
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <button disabled={(!link.trim() && !screenshotFile && !missionEditMode) || busy} onClick={submit}
                        style={{ padding: "11px 24px", borderRadius: 99, border: "none", background: (link.trim() || screenshotFile || missionEditMode) ? PRIMARY : (isDark ? "rgba(255,255,255,0.1)" : "#e5e7eb"), color: (link.trim() || screenshotFile || missionEditMode) ? "#fff" : C.muted, fontSize: 14, fontWeight: 700, cursor: (link.trim() || screenshotFile || missionEditMode) ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
                        {uploading ? "업로드 중..." : busy ? "등록 중..." : missionEditMode ? "수정 저장" : "인증하기"}
                      </button>
                      {missionEditMode && <button onClick={() => { setMissionEditMode(false); setLink(""); setMemo(""); setScreenshotFile(null); setScreenshotPreview(null); setExtraFile(null); setExtraPreview(""); }} style={{ padding: "10px 16px", borderRadius: 99, border: "1px solid " + bdr, background: "transparent", color: C.muted, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>취소</button>}
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>{isViewing ? "미인증" : !user ? "로그인 후 참여할 수 있습니다" : !isParticipant ? "참가 신청 후 인증할 수 있습니다" : isFuture(selDay) ? "아직 시작되지 않은 Day입니다" : "인증 기간이 지났습니다"}</div>
                )}
                </>)}

                {/* Day별 추가활동 */}
                {daySubTab === "dayExtra" && !isViewing && isParticipant && (
                  <ExtraActivityTab
                    ch={ch} C={C} bdr={bdr} card={card} isDark={isDark} mob={mob}
                    user={user} missions={missions} setMissions={setMissions}
                    isParticipant={isParticipant} isAdmin={isAdmin}
                    vM={vM} totalDays={totalDays} currentDayNum={currentDayNum}
                    dayDate={dayDate} showToast={showToast} fixedDay={selDay}
                  />
                )}
                {daySubTab === "dayExtra" && !isParticipant && (
                  <div style={{ textAlign: "center", padding: "32px 16px", color: C.muted, fontSize: 13 }}>참가자만 추가활동을 올릴 수 있습니다</div>
                )}

                {/* 참가자 인증 목록 */}
                {daySubTab === "others" && ((allByDay[selDay] || []).length === 0 ? (
                  <div style={{ textAlign: "center", padding: "32px 16px", color: C.muted, fontSize: 13 }}>아직 이 Day에 인증한 참가자가 없습니다</div>
                ) : (
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 10 }}>Day {selDay} 참가자 인증 ({(allByDay[selDay] || []).length}명)</div>
                    {(allByDay[selDay] || []).map(m => (
                      <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid " + bdr }}>
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: PRIMARY, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{(m.nick || "?")[0]}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{maskNick(m.nick)}</div>
                          {m.screenshot_url && <a href={m.screenshot_url} target="_blank" rel="noopener noreferrer"><img src={m.screenshot_url} alt="인증" style={{ width: 60, height: 40, objectFit: "cover", borderRadius: 6, marginTop: 4, display: "block" }} /></a>}
                          {m.link && !m.link.includes("supabase.co/storage") && <a href={m.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: PRIMARY, textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>{m.link}</a>}
                          {hasExtra(m) && <div style={{ display: "flex", gap: 4, marginTop: 4 }}>{getExtraLinks(m.extra_link).map((url, ei) => <a key={ei} href={url} target="_blank" rel="noopener noreferrer"><img src={url} alt="추가활동" style={{ width: 50, height: 34, objectFit: "cover", borderRadius: 4, display: "block" }} /></a>)}</div>}
                        </div>
                        <span style={{ fontSize: 11, color: C.muted, flexShrink: 0 }}>{new Date(m.created_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}</span>
                        {user?.role === "admin" && (
                          <button onClick={async () => { if (!confirm(`${m.nick}의 Day ${selDay} 인증을 삭제하시겠습니까?`)) return; await supabase.from("challenge_missions").delete().eq("id", m.id); setMissions(p => p.filter(x => x.id !== m.id)); }}
                            title="삭제" style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(239,68,68,0.5)", padding: 4, flexShrink: 0 }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── 탭: 참가자 현황 ── */}
        {tab === "members" && (() => {
          // 참가자별 인증 현황 집계
          const memberMap = {};
          missions.forEach(m => {
            if (!memberMap[m.uid]) memberMap[m.uid] = { nick: m.nick, uid: m.uid, days: {}, count: 0 };
            if (!memberMap[m.uid].days[m.day]) { memberMap[m.uid].days[m.day] = m; memberMap[m.uid].count++; }
          });
          const members = Object.values(memberMap).sort((a, b) => calcScore(b.days) - calcScore(a.days));
          const totalMissions = missions.filter(m => m.day > 0).length;
          const avgPct = members.length > 0 ? Math.round(members.reduce((s, m) => s + m.count, 0) / members.length / totalDays * 100) : 0;
          return (
            <div>
              {/* 요약 통계 */}
              <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr 1fr" : "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
                {[
                  ["참가자", `${members.length}명`, PRIMARY],
                  ["총 인증", `${totalMissions}건`, "#22c55e"],
                  ["평균 달성률", `${avgPct}%`, "#f59e0b"],
                  ["현재 Day", `${currentDayNum}`, C.muted],
                ].map(([label, val, color]) => (
                  <div key={label} style={{ background: card, border: "1px solid " + bdr, borderRadius: 12, padding: "14px 12px", textAlign: "center" }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color }}>{val}</div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{label}</div>
                  </div>
                ))}
              </div>
              {members.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 20px", color: C.muted, border: "1px dashed " + bdr, borderRadius: 16 }}>아직 인증 기록이 없습니다</div>
              ) : (
                <div style={{ background: card, border: "1px solid " + bdr, borderRadius: 14, overflow: "hidden" }}>
                  {members.map((mem, idx) => {
                    const memberPct = Math.round((mem.count / totalDays) * 100);
                    const memberScore = calcScore(mem.days);
                    return (
                      <div key={mem.uid} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 18px", borderBottom: idx < members.length - 1 ? "1px solid " + bdr : "none", cursor: isAdmin ? "pointer" : "default" }}
                        onClick={() => { if (isAdmin) { setViewAsMember(mem); setTab("calendar"); setSelDay(null); } }}>
                        <span style={{ fontSize: 14, fontWeight: 900, color: idx < 3 ? ["#f59e0b","#94a3b8","#cd7f32"][idx] : C.muted, width: 24, textAlign: "center", flexShrink: 0 }}>{idx + 1}</span>
                        <div style={{ width: 30, height: 30, borderRadius: "50%", background: idx < 3 ? ["#f59e0b","#94a3b8","#cd7f32"][idx] : PRIMARY, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{(mem.nick || "?")[0]}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{isAdmin ? (mem.nick || "?") : maskNick(mem.nick)}</div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                            <div style={{ flex: 1, height: 4, borderRadius: 99, background: isDark ? "rgba(255,255,255,0.06)" : "#e5e7eb" }}>
                              <div style={{ height: "100%", borderRadius: 99, background: memberPct >= 80 ? "#22c55e" : PRIMARY, width: `${memberPct}%` }} />
                            </div>
                            <span style={{ fontSize: 10, color: C.muted, flexShrink: 0 }}>{mem.count}일 ({memberPct}%)</span>
                          </div>
                        </div>
                        <span style={{ fontSize: 16, fontWeight: 800, color: "#f59e0b", flexShrink: 0 }}>{memberScore}점</span>
                        {isAdmin && <span style={{ fontSize: 10, color: PRIMARY, fontWeight: 700, flexShrink: 0 }}>&rarr;</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {/* ── 탭: 전체 피드 ── */}
        {tab === "feed" && (() => {
          const feedMissions = missions.filter(m => m.day > 0);
          const deleteMission = async (id) => {
            if (!confirm("이 인증 기록을 삭제하시겠습니까?")) return;
            await supabase.from("challenge_missions").delete().eq("id", id);
            setMissions(p => p.filter(x => x.id !== id));
          };
          return feedMissions.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: C.muted, border: "1px dashed " + bdr, borderRadius: 20 }}>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>아직 인증이 없어요</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {feedMissions.map(m => (
                <div key={m.id} style={{ background: card, border: "1px solid " + bdr, borderRadius: 16, padding: "16px 20px", boxShadow: "0 1px 2px rgba(0,0,0,0.04)", display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: PRIMARY, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{(m.nick || "?")[0]}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{isAdmin ? m.nick : maskNick(m.nick)}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: PRIMARY, background: "rgba(59,130,246,0.08)", padding: "2px 8px", borderRadius: 99 }}>Day {m.day}</span>
                      {hasExtra(m) && <span style={{ fontSize: 10, fontWeight: 700, color: "#f59e0b", background: "rgba(245,158,11,0.1)", padding: "2px 6px", borderRadius: 99 }}>+0.5 ({getExtraLinks(m.extra_link).length})</span>}
                      {lateDaysFor(m) > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: "#ef4444", background: "rgba(239,68,68,0.1)", padding: "2px 6px", borderRadius: 99 }}>-{lateDaysFor(m) * 0.5}</span>}
                      <span style={{ fontSize: 11, color: C.muted, marginLeft: "auto" }}>{new Date(m.created_at).toLocaleDateString("ko-KR")}</span>
                    </div>
                    {m.body && <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>{m.body}</div>}
                    {m.link && <a href={m.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: PRIMARY, textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>{m.link}</a>}
                    {hasExtra(m) && <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>{getExtraLinks(m.extra_link).map((url, ei) => <a key={ei} href={url} target="_blank" rel="noopener noreferrer"><img src={url} alt="추가활동" style={{ width: 80, height: 54, objectFit: "cover", borderRadius: 6, display: "block", border: "1px solid rgba(245,158,11,0.2)" }} /></a>)}</div>}
                  </div>
                  {user?.role === "admin" && (
                    <button onClick={() => deleteMission(m.id)} title="삭제" style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(239,68,68,0.5)", fontSize: 16, flexShrink: 0, padding: 4 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          );
        })()}

        {/* ── 탭: 내 기록 ── */}
        {tab === "my" && (
          <div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>총 {vChecked}일 인증 완료 / {totalDays}일</div>
            {totalDays > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {Array.from({ length: totalDays }, (_, i) => i + 1).map(d => {
                  const m = vM[d];
                  const dt = dayDate(d);
                  const past = d <= currentDayNum;
                  return (
                    <div key={d} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", borderRadius: 12, background: card, border: "1px solid " + bdr }}>
                      {/* 체크 아이콘 */}
                      <div style={{ width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: m ? "rgba(34,197,94,0.1)" : past ? "rgba(239,68,68,0.06)" : "rgba(0,0,0,0.03)" }}>
                        {m ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                          : past ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" style={{ opacity: 0.5 }}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                          : <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid " + bdr }} />}
                      </div>
                      {/* Day 정보 */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Day {d}</span>
                          <span style={{ fontSize: 11, color: C.muted }}>{dt.toLocaleDateString("ko-KR", { month: "short", day: "numeric", weekday: "short" })}</span>
                          {m && <span style={{ fontSize: 11, fontWeight: 800, color: lateDaysFor(m) > 0 ? "#ef4444" : PRIMARY }}>{scoreForMission(d, m)}점</span>}
                        </div>
                        {m?.link && <a href={m.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: PRIMARY, textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block", marginTop: 2 }}>{m.link}</a>}
                        {m?.body && <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{m.body}</div>}
                        {hasExtra(m) && <span style={{ fontSize: 11, color: "#f59e0b", marginTop: 2, display: "block" }}>추가활동 {getExtraLinks(m.extra_link).length}개</span>}
                        {m && (() => { const s = scoreBreakdown(d, m); return <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>기본 {s.base}점{s.bonus > 0 ? ` + 추가 ${s.bonus}점` : ""}{s.penalty > 0 ? ` - 지연 ${s.penalty}점` : ""}</div>; })()}
                      </div>
                      {/* 등록 버튼 (미인증 + 오늘 이전) */}
                      {!m && past && user && (
                        <button onClick={() => { setSelDay(d); setTab("calendar"); setMissionEditMode(false); }}
                          style={{ padding: "6px 14px", borderRadius: 99, border: "1px solid " + bdr, background: "transparent", color: PRIMARY, fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0, fontFamily: "inherit" }}>
                          인증
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
        {/* ── 탭: 자유게시판 ── */}
        {tab === "board" && <FreeBoard ch={ch} C={C} bdr={bdr} card={card} isDark={isDark} mob={mob} user={user} />}
      </div>
    </div>
  );
}

/* ═══ 자유게시판 (참여자 전용) ═════════════════════════════ */
function FreeBoard({ ch, C, bdr, card, isDark, mob, user }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [writing, setWriting] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [openId, setOpenId] = useState(null); // 댓글 열기
  const [comment, setComment] = useState("");
  const inp = { width: "100%", padding: "12px 16px", borderRadius: 10, border: "1px solid " + bdr, background: isDark ? "rgba(255,255,255,0.06)" : "#fff", color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };

  // day = -1 → 자유게시판 글
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.from("challenge_missions").select("*").eq("challenge_id", ch.id).eq("day", -1).order("created_at", { ascending: false });
        setPosts(data || []);
      } catch { setPosts([]); }
      setLoading(false);
    })();
  }, [ch.id]);

  const submitPost = async () => {
    if (!title.trim()) return; setBusy(true);
    try {
      const row = { id: "cb_" + Date.now(), challenge_id: ch.id, uid: user.uid, nick: user.nick || "참가자", day: -1, title: title.trim(), body: body.trim(), link: null, extra_link: null, created_at: new Date().toISOString() };
      await supabase.from("challenge_missions").insert(row);
      setPosts(p => [{ ...row, comments: [] }, ...p]);
      setTitle(""); setBody(""); setWriting(false);
    } catch (e) { alert("등록 실패: " + e.message); }
    setBusy(false);
  };

  const submitComment = async (postId) => {
    if (!comment.trim()) return;
    try {
      // 댓글은 body에 JSON으로 append (별도 테이블 없이 간단 구현)
      const post = posts.find(p => p.id === postId);
      const comments = post?._comments || [];
      comments.push({ uid: user.uid, nick: user.nick || "참가자", text: comment.trim(), at: new Date().toISOString() });
      const newBody = (post?.body || "") + `\n<!--comment:${JSON.stringify({ uid: user.uid, nick: user.nick, text: comment.trim(), at: new Date().toISOString() })}-->`;
      await supabase.from("challenge_missions").update({ body: newBody }).eq("id", postId);
      setPosts(p => p.map(x => x.id === postId ? { ...x, body: newBody, _comments: comments } : x));
      setComment("");
    } catch (e) { alert("댓글 실패: " + e.message); }
  };

  // 댓글 파싱
  const parseComments = (bodyStr) => {
    if (!bodyStr) return [];
    const regex = /<!--comment:(.*?)-->/g;
    const comments = [];
    let match;
    while ((match = regex.exec(bodyStr)) !== null) { try { comments.push(JSON.parse(match[1])); } catch {} }
    return comments;
  };
  const cleanBody = (bodyStr) => (bodyStr || "").replace(/\n?<!--comment:.*?-->/g, "").trim();

  if (loading) return <div style={{ textAlign: "center", padding: "40px", color: C.muted }}>불러오는 중...</div>;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: C.muted }}>{posts.length}개 글</div>
        {user && <button onClick={() => setWriting(!writing)} style={{ padding: "10px 22px", borderRadius: 99, border: "none", background: writing ? C.muted : PRIMARY, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{writing ? "취소" : "글쓰기"}</button>}
      </div>

      {/* 글쓰기 폼 */}
      {writing && (
        <div style={{ background: card, border: "1px solid " + bdr, borderRadius: 16, padding: "20px", marginBottom: 20, boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="제목" style={{ ...inp, marginBottom: 8, fontWeight: 700 }} />
          <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="자유롭게 글을 남겨보세요 (질문, 팁 공유, 근황 등)" rows={4} style={{ ...inp, resize: "vertical", marginBottom: 12 }} />
          <button disabled={!title.trim() || busy} onClick={submitPost}
            style={{ padding: "10px 24px", borderRadius: 99, border: "none", background: title.trim() ? PRIMARY : (isDark ? "rgba(255,255,255,0.1)" : "#e5e7eb"), color: title.trim() ? "#fff" : C.muted, fontSize: 14, fontWeight: 700, cursor: title.trim() ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
            {busy ? "등록 중..." : "등록하기"}
          </button>
        </div>
      )}

      {/* 글 목록 */}
      {posts.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: C.muted, border: "1px dashed " + bdr, borderRadius: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>아직 글이 없어요</div>
          <div style={{ fontSize: 13 }}>성장 프로그램 참여자끼리 자유롭게 소통해보세요!</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {posts.map(p => {
            const comments = p._comments || parseComments(p.body);
            const clean = cleanBody(p.body);
            const isOpen = openId === p.id;
            return (
              <div key={p.id} style={{ background: card, border: "1px solid " + bdr, borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
                <div style={{ padding: "18px 22px" }}>
                  {/* 작성자 */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: PRIMARY, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{(p.nick || "?")[0]}</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{p.nick}</div>
                      <div style={{ fontSize: 11, color: C.muted }}>{new Date(p.created_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
                    </div>
                  </div>
                  {/* 내용 */}
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 8 }}>{p.title}</div>
                  {clean && <div style={{ fontSize: 14, color: C.text, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{clean}</div>}
                  {/* 댓글 토글 */}
                  <button onClick={() => setOpenId(isOpen ? null : p.id)}
                    style={{ marginTop: 12, background: "none", border: "none", color: C.muted, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                    댓글 {comments.length > 0 ? comments.length : ""}
                  </button>
                </div>

                {/* 댓글 영역 */}
                {isOpen && (
                  <div style={{ borderTop: "1px solid " + bdr, padding: "16px 22px", background: isDark ? "rgba(255,255,255,0.02)" : "#f9fafb" }}>
                    {comments.length > 0 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
                        {comments.map((c, i) => (
                          <div key={i} style={{ display: "flex", gap: 10 }}>
                            <div style={{ width: 24, height: 24, borderRadius: "50%", background: isDark ? "rgba(255,255,255,0.1)" : "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: C.muted, flexShrink: 0, marginTop: 2 }}>{(c.nick || "?")[0]}</div>
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{c.nick}</span>
                                <span style={{ fontSize: 11, color: C.muted }}>{new Date(c.at).toLocaleDateString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                              </div>
                              <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6, marginTop: 2 }}>{c.text}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* 댓글 입력 */}
                    {user && (
                      <div style={{ display: "flex", gap: 8 }}>
                        <input value={comment} onChange={e => setComment(e.target.value)} placeholder="댓글을 남겨보세요"
                          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitComment(p.id); } }}
                          style={{ ...inp, flex: 1 }} />
                        <button onClick={() => submitComment(p.id)} disabled={!comment.trim()}
                          style={{ padding: "10px 18px", borderRadius: 99, border: "none", background: comment.trim() ? PRIMARY : (isDark ? "rgba(255,255,255,0.1)" : "#e5e7eb"), color: comment.trim() ? "#fff" : C.muted, fontSize: 13, fontWeight: 700, cursor: comment.trim() ? "pointer" : "not-allowed", flexShrink: 0, fontFamily: "inherit" }}>
                          등록
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══ 공개 현황판 (SEO 크롤링 대상) ═════════════════════════ */
function PublicLinkBoard({ challengeId, C, bdr, card, isDark, mob, title, isAdmin }) {
  const [links, setLinks] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.from("challenge_missions").select("id,nick,day,link,extra_link,created_at").eq("challenge_id", challengeId).gt("day", 0).not("link", "is", null).order("created_at", { ascending: false });
        setLinks(data || []);
      } catch { setLinks([]); }
      setLoaded(true);
    })();
  }, [challengeId]);

  const deleteLink = async (id) => {
    if (!confirm("이 인증 링크를 삭제하시겠습니까?")) return;
    await supabase.from("challenge_missions").delete().eq("id", id);
    setLinks(p => p.filter(x => x.id !== id));
  };

  if (!loaded || links.length === 0) return null;

  const uniqueUsers = new Set(links.map(l => l.nick)).size;
  const latestDay = links.length > 0 ? Math.max(...links.map(l => l.day)) : 0;
  const displayLinks = expanded ? links : links.slice(0, 12);

  return (
    <div style={{ marginBottom: 36 }}>
      {/* 현황판 헤더 */}
      <div style={{ background: isDark ? "rgba(59,130,246,0.06)" : "rgba(59,130,246,0.04)", border: "1px solid rgba(59,130,246,0.12)", borderRadius: 16, padding: mob ? "20px 18px" : "24px 28px", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={PRIMARY} strokeWidth="2" strokeLinecap="round"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>
              <h2 style={{ fontSize: mob ? 18 : 20, fontWeight: 800, color: C.text, margin: 0 }}>실시간 현황판</h2>
            </div>
            <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>참가자들이 올린 콘텐츠를 실시간으로 확인하세요</p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ background: card, border: "1px solid " + bdr, borderRadius: 10, padding: "8px 14px", textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: PRIMARY }}>{links.length}</div>
              <div style={{ fontSize: 10, color: C.muted }}>총 인증</div>
            </div>
            <div style={{ background: card, border: "1px solid " + bdr, borderRadius: 10, padding: "8px 14px", textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#22c55e" }}>{uniqueUsers}</div>
              <div style={{ fontSize: 10, color: C.muted }}>참가자</div>
            </div>
            <div style={{ background: card, border: "1px solid " + bdr, borderRadius: 10, padding: "8px 14px", textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#f59e0b" }}>D{latestDay}</div>
              <div style={{ fontSize: 10, color: C.muted }}>최신</div>
            </div>
          </div>
        </div>
      </div>
      {/* 링크 목록 */}
      <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr", gap: 8 }}>
        {displayLinks.map((l, i) => (
          <div key={l.id || i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 12, border: "1px solid " + bdr, background: card, transition: "all 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = PRIMARY; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = bdr; }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: PRIMARY, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{(l.nick || "?")[0]}</div>
            <a href={l.link} target="_blank" rel="noopener noreferrer" style={{ flex: 1, minWidth: 0, textDecoration: "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 1 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{isAdmin ? l.nick : maskNick(l.nick)}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: PRIMARY, background: "rgba(59,130,246,0.08)", padding: "1px 7px", borderRadius: 99 }}>Day {l.day}</span>
              </div>
              <div style={{ fontSize: 11, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.link}</div>
            </a>
            {isAdmin && (
              <button onClick={() => deleteLink(l.id)} title="삭제"
                style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(239,68,68,0.5)", padding: 4, flexShrink: 0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
              </button>
            )}
            {!isAdmin && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="1.5" style={{ flexShrink: 0, opacity: 0.5 }}><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>}
          </div>
        ))}
      </div>
      {links.length > 12 && !expanded && (
        <button onClick={() => setExpanded(true)}
          style={{ display: "block", margin: "16px auto 0", padding: "10px 28px", borderRadius: 99, border: "1px solid " + bdr, background: "transparent", color: C.muted, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
          전체 {links.length}개 보기
        </button>
      )}
    </div>
  );
}

/* ═══ AdminPanel ═══════════════════════════════════════════ */
function AdminPanel({ ch, C, bdr, card, isDark, mob, apps, onBack, onEdit, onStatus, onDelete, onBadge, onViewMember }) {
  const SL = { pending: ["대기", "#f59e0b"], paid: ["결제완료", PRIMARY], confirmed: ["참여확정", "#22c55e"], cancelled: ["취소", "#ef4444"] };
  const [proofFilter, setProofFilter] = useState("all");
  const [adminTab, setAdminTab] = useState("applicants"); // "applicants" | "missions"
  const [adminMissions, setAdminMissions] = useState([]);
  const [missionsLoading, setMissionsLoading] = useState(false);
  const [expandedUser, setExpandedUser] = useState(null);
  const confirmedApps = apps.filter(a => a.status === "confirmed");
  const stat = {
    missingStart: confirmedApps.filter(a => !a.start_screenshot_url).length,
    missingEnd: confirmedApps.filter(a => !a.end_screenshot_url).length,
    completeProof: confirmedApps.filter(a => a.start_screenshot_url && a.end_screenshot_url).length,
  };
  const filteredApps = apps.filter(a => {
    if (proofFilter === "confirmed") return a.status === "confirmed";
    if (proofFilter === "missingStart") return a.status === "confirmed" && !a.start_screenshot_url;
    if (proofFilter === "missingEnd") return a.status === "confirmed" && !a.end_screenshot_url;
    if (proofFilter === "completeProof") return a.status === "confirmed" && a.start_screenshot_url && a.end_screenshot_url;
    return true;
  });

  // 인증현황 탭 진입 시 미션 데이터 로드
  useEffect(() => {
    if (adminTab !== "missions" || !ch?.id) return;
    setMissionsLoading(true);
    loadMissions(ch.id).then(d => setAdminMissions(d)).catch(() => setAdminMissions([])).finally(() => setMissionsLoading(false));
  }, [adminTab, ch?.id]);

  // 인증현황 데이터 계산
  const totalDays = Math.max(parseInt(ch.duration) || 10, 1);
  const missionsByUser = {};
  adminMissions.filter(m => m.day > 0).forEach(m => {
    const key = m.uid || m.nick;
    if (!missionsByUser[key]) missionsByUser[key] = { uid: m.uid, nick: m.nick, days: {} };
    missionsByUser[key].days[m.day] = m;
  });
  // confirmedApps 기준으로 참가자 목록 구성 (미션 없는 참가자도 포함)
  const participantMap = {};
  confirmedApps.forEach(a => {
    const key = a.uid || a.name;
    if (!participantMap[key]) participantMap[key] = { uid: a.uid, nick: a.name, days: {} };
  });
  Object.keys(missionsByUser).forEach(k => {
    if (!participantMap[k]) participantMap[k] = missionsByUser[k];
    else participantMap[k].days = { ...participantMap[k].days, ...missionsByUser[k].days };
  });
  const participants = Object.values(participantMap);
  participants.sort((a, b) => {
    const ac = Object.keys(a.days).length, bc = Object.keys(b.days).length;
    return bc - ac;
  });

  const tabBtn = (id, label) => (
    <button key={id} onClick={() => setAdminTab(id)} style={{ padding: "10px 20px", borderRadius: "12px 12px 0 0", border: "1px solid " + (adminTab === id ? bdr : "transparent"), borderBottom: adminTab === id ? "2px solid " + PRIMARY : "2px solid transparent", background: adminTab === id ? card : "transparent", color: adminTab === id ? PRIMARY : C.muted, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{label}</button>
  );

  return (
    <div style={{ background: isDark ? "transparent" : "#f9fafb", minHeight: "calc(100vh - 64px)" }}>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: mob ? "24px 16px 80px" : "40px 20px 100px" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: C.muted, fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 24, display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg> 뒤로
        </button>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 4 }}>{ch.title}</h2>
            <p style={{ fontSize: 13, color: C.muted }}>총 {apps.length}명 신청 · 확정 {confirmedApps.length}명 · 시작 미인증 {stat.missingStart}명 · 마지막 미인증 {stat.missingEnd}명</p>
          </div>
          <button onClick={onEdit} style={{ padding: "10px 22px", borderRadius: 99, border: "1px solid " + bdr, background: "transparent", color: C.text, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>성장 프로그램 수정</button>
        </div>

        {/* 탭 전환 */}
        <div style={{ display: "flex", gap: 0, borderBottom: "1px solid " + bdr, marginBottom: 20 }}>
          {tabBtn("applicants", "신청자 관리")}
          {tabBtn("missions", "인증 현황")}
        </div>

        {adminTab === "applicants" && (<>
        {apps.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            {[
              ["all", `전체 ${apps.length}`],
              ["confirmed", `확정 ${confirmedApps.length}`],
              ["missingStart", `시작 미인증 ${stat.missingStart}`],
              ["missingEnd", `마지막 미인증 ${stat.missingEnd}`],
              ["completeProof", `인증 완료 ${stat.completeProof}`],
            ].map(([id, label]) => (
              <button key={id} onClick={() => setProofFilter(id)} style={{ padding: "8px 12px", borderRadius: 99, border: "1px solid " + (proofFilter === id ? PRIMARY : bdr), background: proofFilter === id ? "rgba(59,130,246,0.08)" : "transparent", color: proofFilter === id ? PRIMARY : C.muted, fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>{label}</button>
            ))}
          </div>
        )}

        {apps.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: C.muted }}><div style={{ fontSize: 15, fontWeight: 700 }}>아직 신청자가 없습니다</div></div>
        ) : filteredApps.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 20px", color: C.muted, border: "1px dashed " + bdr, borderRadius: 16 }}>조건에 맞는 신청자가 없습니다</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filteredApps.map(a => {
              const [sl, sc] = SL[a.status] || ["알 수 없음", "#6b7280"];
              return (
                <div key={a.id} style={{ background: card, border: "1px solid " + bdr, borderRadius: 16, padding: "18px 22px", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{a.name}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: sc, background: sc + "15", padding: "3px 12px", borderRadius: 99 }}>{sl}</span>
                      {a.status === "confirmed" && <span style={{ fontSize: 11, fontWeight: 800, color: a.start_screenshot_url ? "#16a34a" : "#ef4444", background: a.start_screenshot_url ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)", padding: "3px 8px", borderRadius: 99 }}>시작 {a.start_screenshot_url ? "완료" : "미인증"}</span>}
                      {a.status === "confirmed" && <span style={{ fontSize: 11, fontWeight: 800, color: a.end_screenshot_url ? "#16a34a" : "#ef4444", background: a.end_screenshot_url ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)", padding: "3px 8px", borderRadius: 99 }}>마지막 {a.end_screenshot_url ? "완료" : "미인증"}</span>}
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {a.status !== "confirmed" && <button onClick={() => onStatus(a.id, "confirmed")} style={{ padding: "7px 16px", borderRadius: 99, border: "none", background: "#22c55e", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>확정</button>}
                      {a.status === "confirmed" && ch.badge_image && <button onClick={() => onBadge(a)} style={{ padding: "7px 16px", borderRadius: 99, border: "none", background: "#f59e0b", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>뱃지 지급</button>}
                      <button onClick={() => onDelete(a.id)} style={{ padding: "7px 16px", borderRadius: 99, border: "1px solid rgba(239,68,68,0.3)", background: "transparent", color: "#ef4444", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>삭제</button>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr 1fr", gap: 6, fontSize: 12, color: C.muted }}>
                    <div><strong style={{ color: C.text }}>연락처</strong> {a.phone}</div>
                    <div><strong style={{ color: C.text }}>이메일</strong> {a.email}</div>
                    <div><strong style={{ color: C.text }}>목적</strong> {a.purpose}</div>
                    {a.sns_link && <div style={{ gridColumn: mob ? "1" : "1/4" }}><strong style={{ color: C.text }}>SNS</strong> <a href={a.sns_link} target="_blank" rel="noopener noreferrer" style={{ color: PRIMARY }}>{a.sns_link}</a></div>}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr", gap: 10, marginTop: 14 }}>
                      {a.start_screenshot_url ? (
                        <a href={a.start_screenshot_url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", border: "1px solid " + bdr, borderRadius: 12, overflow: "hidden", background: isDark ? "rgba(255,255,255,0.03)" : "#fafafa" }}>
                          <img src={a.start_screenshot_url} alt="시작 인증" style={{ width: "100%", height: 110, objectFit: "cover", display: "block" }} />
                          <div style={{ padding: "8px 10px", fontSize: 12, fontWeight: 700, color: C.text }}>시작 인증</div>
                        </a>
                      ) : (
                        <div style={{ border: "1px dashed " + bdr, borderRadius: 12, padding: 16, fontSize: 12, color: C.muted, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 110 }}>시작 인증 미등록</div>
                      )}
                      {a.end_screenshot_url ? (
                        <a href={a.end_screenshot_url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", border: "1px solid " + bdr, borderRadius: 12, overflow: "hidden", background: isDark ? "rgba(255,255,255,0.03)" : "#fafafa" }}>
                          <img src={a.end_screenshot_url} alt="종료 인증" style={{ width: "100%", height: 110, objectFit: "cover", display: "block" }} />
                          <div style={{ padding: "8px 10px", fontSize: 12, fontWeight: 700, color: C.text }}>종료 인증</div>
                        </a>
                      ) : (
                        <div style={{ border: "1px dashed " + bdr, borderRadius: 12, padding: 16, fontSize: 12, color: C.muted, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 110 }}>마지막 인증 미등록</div>
                      )}
                  </div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 8 }}>{new Date(a.created_at).toLocaleString("ko-KR")}</div>
                </div>
              );
            })}
          </div>
        )}
        </>)}

        {/* ═══ 인증 현황 탭 ═══ */}
        {adminTab === "missions" && (
          missionsLoading ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: C.muted, fontSize: 14 }}>인증 데이터 로딩 중...</div>
          ) : participants.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: C.muted }}><div style={{ fontSize: 15, fontWeight: 700 }}>아직 인증 데이터가 없습니다</div></div>
          ) : (<>
            {/* 요약 통계 */}
            <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr 1fr" : "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
              {[
                ["참가자", participants.length + "명", PRIMARY],
                ["총 인증", adminMissions.filter(m => m.day > 0).length + "건", "#22c55e"],
                ["평균 달성", Math.round(participants.reduce((s, p) => s + Object.keys(p.days).length, 0) / participants.length * 100 / totalDays) + "%", "#f59e0b"],
                ["완주자", participants.filter(p => Object.keys(p.days).length >= totalDays).length + "명", "#8b5cf6"],
              ].map(([label, val, color]) => (
                <div key={label} style={{ background: card, border: "1px solid " + bdr, borderRadius: 14, padding: "16px 14px", textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color }}>{val}</div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 4, fontWeight: 600 }}>{label}</div>
                </div>
              ))}
            </div>

            {/* 인증 그리드 */}
            <div style={{ background: card, border: "1px solid " + bdr, borderRadius: 16, overflow: "hidden" }}>
              {/* 헤더 */}
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: Math.max(400, 120 + totalDays * 38) }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid " + bdr }}>
                      <th style={{ padding: "12px 14px", textAlign: "left", fontSize: 13, fontWeight: 700, color: C.text, position: "sticky", left: 0, background: card, zIndex: 1, minWidth: 100 }}>참가자</th>
                      {Array.from({ length: totalDays }, (_, i) => (
                        <th key={i} style={{ padding: "12px 4px", textAlign: "center", fontSize: 11, fontWeight: 700, color: C.muted, minWidth: 34 }}>D{i + 1}</th>
                      ))}
                      <th style={{ padding: "12px 14px", textAlign: "center", fontSize: 12, fontWeight: 700, color: C.text, minWidth: 60 }}>달성률</th>
                    </tr>
                  </thead>
                  <tbody>
                    {participants.map((p, pi) => {
                      const doneCount = Object.keys(p.days).length;
                      const rate = Math.round(doneCount / totalDays * 100);
                      const isExpanded = expandedUser === (p.uid || p.nick);
                      return (
                        <React.Fragment key={p.uid || p.nick || pi}>
                          <tr onClick={() => setExpandedUser(isExpanded ? null : (p.uid || p.nick))} style={{ borderBottom: "1px solid " + bdr, cursor: "pointer", background: isExpanded ? (isDark ? "rgba(59,130,246,0.06)" : "rgba(59,130,246,0.03)") : "transparent", transition: "background 0.15s" }}>
                            <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 600, color: C.text, position: "sticky", left: 0, background: isExpanded ? (isDark ? "rgba(59,130,246,0.06)" : "rgba(59,130,246,0.03)") : card, zIndex: 1, whiteSpace: "nowrap" }}>
                              {p.nick}
                              <span style={{ fontSize: 11, color: C.muted, marginLeft: 6 }}>{doneCount}/{totalDays}</span>
                            </td>
                            {Array.from({ length: totalDays }, (_, i) => {
                              const m = p.days[i + 1];
                              return (
                                <td key={i} style={{ padding: "10px 4px", textAlign: "center" }}>
                                  {m ? (
                                    <div style={{ width: 24, height: 24, borderRadius: 6, background: "rgba(34,197,94,0.15)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                    </div>
                                  ) : (
                                    <div style={{ width: 24, height: 24, borderRadius: 6, background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                                      <div style={{ width: 6, height: 6, borderRadius: 99, background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" }} />
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                            <td style={{ padding: "10px 14px", textAlign: "center" }}>
                              <span style={{ fontSize: 13, fontWeight: 800, color: rate >= 100 ? "#8b5cf6" : rate >= 70 ? "#22c55e" : rate >= 40 ? "#f59e0b" : "#ef4444" }}>{rate}%</span>
                            </td>
                          </tr>
                          {/* 확장 상세 */}
                          {isExpanded && (() => {
                            const userApp = apps.find(a => a.uid === p.uid || a.name === p.nick);
                            const startDate = ch.start_date ? new Date(ch.start_date) : new Date();
                            const localDateOnly = dt => new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
                            const dayDate = d => { const dt = new Date(startDate); dt.setDate(dt.getDate() + d - 1); return dt; };
                            const isWeekend = d => { const dow = dayDate(d).getDay(); return dow === 0 || dow === 6; };
                            const lateDays = m => { if (!m?.created_at || Number(m.day) <= 0) return 0; return Math.max(0, Math.floor((localDateOnly(new Date(m.created_at)) - localDateOnly(dayDate(Number(m.day)))) / 86400000)); };
                            const scoreFor = (day, m) => { const base = isWeekend(Number(day)) ? 2 : 1; const bonus = getExtraLinks(m.extra_link).length * 0.5; const penalty = Math.min(base + bonus, lateDays(m) * 0.5); return Math.max(0, base + bonus - penalty); };
                            const totalScore = Object.entries(p.days).reduce((s, [d, m]) => s + scoreFor(d, m), 0);
                            return (
                            <tr>
                              <td colSpan={totalDays + 2} style={{ padding: 0, borderBottom: "1px solid " + bdr }}>
                                <div style={{ padding: mob ? "16px" : "20px 24px", background: isDark ? "rgba(255,255,255,0.02)" : "#f9fafb" }}>
                                  {/* 참가자 요약 헤더 */}
                                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 16, paddingBottom: 14, borderBottom: "1px solid " + bdr }}>
                                    <div>
                                      <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>{p.nick}</div>
                                      {userApp && <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>연락처: {userApp.phone || "-"} / 이메일: {userApp.email || "-"}</div>}
                                    </div>
                                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                      <span style={{ fontSize: 12, fontWeight: 800, color: PRIMARY, background: "rgba(59,130,246,0.08)", padding: "5px 12px", borderRadius: 99 }}>{Object.keys(p.days).length}/{totalDays}일 ({rate}%)</span>
                                      <span style={{ fontSize: 12, fontWeight: 800, color: "#f59e0b", background: "rgba(245,158,11,0.08)", padding: "5px 12px", borderRadius: 99 }}>{totalScore}점</span>
                                      {rate >= 100 && <span style={{ fontSize: 12, fontWeight: 800, color: "#8b5cf6", background: "rgba(139,92,246,0.08)", padding: "5px 12px", borderRadius: 99 }}>완주</span>}
                                      {onViewMember && <button onClick={e => { e.stopPropagation(); onViewMember({ uid: p.uid, nick: p.nick, days: p.days, count: Object.keys(p.days).length }); }} style={{ padding: "5px 14px", borderRadius: 99, border: "none", background: PRIMARY, color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>미션보드 상세</button>}
                                    </div>
                                  </div>

                                  {/* 시작/종료 인증 */}
                                  {userApp && (
                                    <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 16 }}>
                                      <div style={{ border: "1px solid " + bdr, borderRadius: 14, overflow: "hidden", background: card }}>
                                        <div style={{ padding: "10px 14px", fontSize: 12, fontWeight: 800, color: userApp.start_screenshot_url ? "#16a34a" : "#ef4444", background: userApp.start_screenshot_url ? "rgba(34,197,94,0.06)" : "rgba(239,68,68,0.04)" }}>
                                          시작 인증 {userApp.start_screenshot_url ? "완료" : "미등록"}
                                        </div>
                                        {userApp.start_screenshot_url ? (
                                          <a href={userApp.start_screenshot_url} target="_blank" rel="noopener noreferrer">
                                            <img src={userApp.start_screenshot_url} alt="시작 인증" style={{ width: "100%", height: 160, objectFit: "cover", display: "block" }} />
                                          </a>
                                        ) : (
                                          <div style={{ height: 80, display: "flex", alignItems: "center", justifyContent: "center", color: C.muted, fontSize: 12 }}>인증 이미지 없음</div>
                                        )}
                                      </div>
                                      <div style={{ border: "1px solid " + bdr, borderRadius: 14, overflow: "hidden", background: card }}>
                                        <div style={{ padding: "10px 14px", fontSize: 12, fontWeight: 800, color: userApp.end_screenshot_url ? "#16a34a" : "#ef4444", background: userApp.end_screenshot_url ? "rgba(34,197,94,0.06)" : "rgba(239,68,68,0.04)" }}>
                                          종료 인증 {userApp.end_screenshot_url ? "완료" : "미등록"}
                                        </div>
                                        {userApp.end_screenshot_url ? (
                                          <a href={userApp.end_screenshot_url} target="_blank" rel="noopener noreferrer">
                                            <img src={userApp.end_screenshot_url} alt="종료 인증" style={{ width: "100%", height: 160, objectFit: "cover", display: "block" }} />
                                          </a>
                                        ) : (
                                          <div style={{ height: 80, display: "flex", alignItems: "center", justifyContent: "center", color: C.muted, fontSize: 12 }}>인증 이미지 없음</div>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* 분석 지표 */}
                                  {(() => {
                                    const doneList = Object.entries(p.days).sort(([a],[b]) => Number(a) - Number(b));
                                    const doneCount = doneList.length;
                                    let maxStrk = 0, curStrk = 0, nowStrk = 0;
                                    for (let d = 1; d <= Math.min(totalDays, Math.floor((Date.now() - new Date(ch.start_date || Date.now()).getTime()) / 86400000) + 1); d++) {
                                      if (p.days[d]) { curStrk++; if (curStrk > maxStrk) maxStrk = curStrk; } else curStrk = 0;
                                    }
                                    for (let d = Math.min(totalDays, Math.floor((Date.now() - new Date(ch.start_date || Date.now()).getTime()) / 86400000) + 1); d >= 1; d--) {
                                      if (p.days[d]) nowStrk++; else break;
                                    }
                                    const lateN = doneList.filter(([,m]) => lateDays(m) > 0).length;
                                    const extraN = doneList.filter(([,m]) => m.extra_link).length;
                                    const hourBk = Array(24).fill(0);
                                    doneList.forEach(([,m]) => { if (m.created_at) hourBk[new Date(m.created_at).getHours()]++; });
                                    const maxH = Math.max(...hourBk, 1);
                                    const weekS = [];
                                    for (let w = 0; w < Math.ceil(totalDays / 7); w++) {
                                      let ws = 0;
                                      for (let d = w * 7 + 1; d <= Math.min((w + 1) * 7, totalDays); d++) {
                                        if (p.days[d]) ws += scoreFor(d, p.days[d]);
                                      }
                                      weekS.push(ws);
                                    }
                                    const maxWS = Math.max(...weekS, 1);
                                    const cumS = []; let cm = 0;
                                    const curDay = Math.min(totalDays, Math.floor((Date.now() - new Date(ch.start_date || Date.now()).getTime()) / 86400000) + 1);
                                    for (let d = 1; d <= curDay; d++) { if (p.days[d]) cm += scoreFor(d, p.days[d]); cumS.push(cm); }
                                    const maxCm = Math.max(cm, 1);

                                    const sc = (label, val, sub, color) => (
                                      <div style={{ flex: 1, minWidth: 120, background: card, border: "1px solid " + bdr, borderRadius: 12, padding: "14px 16px" }}>
                                        <div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>{label}</div>
                                        <div style={{ fontSize: 22, fontWeight: 800, color }}>{val}</div>
                                        {sub && <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{sub}</div>}
                                      </div>
                                    );
                                    return (
                                      <div style={{ marginBottom: 20 }}>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 10 }}>분석 지표</div>
                                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                                          {sc("현재 연속", `${nowStrk}일`, `최대 ${maxStrk}일`, "#22c55e")}
                                          {sc("추가활동", `${doneCount > 0 ? Math.round(extraN / doneCount * 100) : 0}%`, `${extraN}/${doneCount}회`, "#f59e0b")}
                                          {sc("지연률", `${doneCount > 0 ? Math.round(lateN / doneCount * 100) : 0}%`, `${lateN}회`, lateN > doneCount * 0.3 ? "#ef4444" : "#22c55e")}
                                          {sc("일평균", curDay > 0 ? (cm / curDay).toFixed(1) : "0", `총 ${totalScore}점`, PRIMARY)}
                                        </div>
                                        {/* 누적 점수 */}
                                        <div style={{ background: card, border: "1px solid " + bdr, borderRadius: 12, padding: "14px 16px", marginBottom: 10 }}>
                                          <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 8 }}>누적 점수 추이</div>
                                          {cumS.length > 0 ? (
                                            <svg width="100%" height="80" viewBox={`0 0 ${Math.max(cumS.length * 16, 32)} 80`} preserveAspectRatio="none" style={{ display: "block" }}>
                                              <defs><linearGradient id={`cg-${p.uid}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={PRIMARY} stopOpacity="0.25"/><stop offset="100%" stopColor={PRIMARY} stopOpacity="0.02"/></linearGradient></defs>
                                              <path d={`M0,80 ${cumS.map((s, i) => `L${i * 16},${80 - (s / maxCm) * 65}`).join(" ")} L${(cumS.length - 1) * 16},80 Z`} fill={`url(#cg-${p.uid})`} />
                                              <polyline fill="none" stroke={PRIMARY} strokeWidth="1.5" points={cumS.map((s, i) => `${i * 16},${80 - (s / maxCm) * 65}`).join(" ")} />
                                            </svg>
                                          ) : <div style={{ fontSize: 11, color: C.muted, textAlign: "center", padding: 12 }}>데이터 없음</div>}
                                        </div>
                                        <div style={{ display: "flex", gap: 10, flexDirection: mob ? "column" : "row" }}>
                                          {/* 주간 점수 */}
                                          <div style={{ flex: 1, background: card, border: "1px solid " + bdr, borderRadius: 12, padding: "14px 16px" }}>
                                            <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 8 }}>주간 점수</div>
                                            <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 60 }}>
                                              {weekS.map((ws, i) => (
                                                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                                                  <div style={{ fontSize: 9, fontWeight: 700, color: ws > 0 ? PRIMARY : C.muted }}>{ws > 0 ? ws.toFixed(1) : ""}</div>
                                                  <div style={{ width: "100%", maxWidth: 28, height: `${Math.max(3, (ws / maxWS) * 45)}px`, borderRadius: 3, background: ws > 0 ? PRIMARY : (isDark ? "rgba(255,255,255,0.06)" : "#e5e7eb") }} />
                                                  <div style={{ fontSize: 8, color: C.muted }}>{i + 1}주</div>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                          {/* 시간대 */}
                                          <div style={{ flex: 1, background: card, border: "1px solid " + bdr, borderRadius: 12, padding: "14px 16px" }}>
                                            <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 8 }}>인증 시간대</div>
                                            <div style={{ display: "flex", gap: 1, alignItems: "flex-end", height: 60 }}>
                                              {hourBk.map((cnt, h) => (
                                                <div key={h} style={{ flex: 1 }}>
                                                  <div style={{ width: "100%", height: `${Math.max(2, (cnt / maxH) * 45)}px`, borderRadius: 1, background: cnt > 0 ? (h < 6 ? "#8b5cf6" : h < 12 ? "#f59e0b" : h < 18 ? "#22c55e" : "#3b82f6") : (isDark ? "rgba(255,255,255,0.03)" : "#f3f4f6") }} />
                                                </div>
                                              ))}
                                            </div>
                                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8, color: C.muted, marginTop: 3 }}>
                                              <span>0시</span><span>6시</span><span>12시</span><span>18시</span><span>24시</span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })()}

                                  {/* 일별 인증 상세 */}
                                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 10 }}>일별 인증 상세</div>
                                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                    {Array.from({ length: totalDays }, (_, i) => {
                                      const day = i + 1;
                                      const m = p.days[day];
                                      const dt = dayDate(day);
                                      const wknd = isWeekend(day);
                                      const late = m ? lateDays(m) : 0;
                                      const score = m ? scoreFor(day, m) : 0;
                                      return (
                                        <div key={i} style={{ border: "1px solid " + bdr, borderRadius: 14, background: card, overflow: "hidden" }}>
                                          {/* Day 헤더 */}
                                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: m ? "rgba(34,197,94,0.04)" : (isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)") }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                              <span style={{ fontSize: 13, fontWeight: 800, color: C.text }}>Day {day}</span>
                                              <span style={{ fontSize: 11, color: C.muted }}>{dt.toLocaleDateString("ko-KR", { month: "short", day: "numeric", weekday: "short" })}</span>
                                              {wknd && <span style={{ fontSize: 10, fontWeight: 800, color: "#f59e0b", background: "rgba(245,158,11,0.1)", padding: "2px 6px", borderRadius: 4 }}>x2</span>}
                                            </div>
                                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                              {m ? (<>
                                                <span style={{ fontSize: 11, fontWeight: 800, color: "#22c55e" }}>인증완료</span>
                                                {late > 0 && <span style={{ fontSize: 10, fontWeight: 800, color: "#ef4444", background: "rgba(239,68,68,0.1)", padding: "2px 6px", borderRadius: 4 }}>지연 {late}일 -{late * 0.5}점</span>}
                                                <span style={{ fontSize: 11, fontWeight: 800, color: PRIMARY }}>{score}점</span>
                                              </>) : (
                                                <span style={{ fontSize: 11, fontWeight: 700, color: "#ef4444" }}>미인증</span>
                                              )}
                                            </div>
                                          </div>
                                          {/* 인증 콘텐츠 */}
                                          {m && (
                                            <div style={{ padding: "12px 14px" }}>
                                              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                                                {/* 스크린샷 */}
                                                {m.screenshot_url && (
                                                  <a href={m.screenshot_url} target="_blank" rel="noopener noreferrer" style={{ flexShrink: 0 }}>
                                                    <img src={m.screenshot_url} alt={`Day ${day} 스크린샷`} style={{ width: 120, height: 90, objectFit: "cover", borderRadius: 10, border: "1px solid " + bdr, display: "block" }} />
                                                  </a>
                                                )}
                                                {/* 추가활동 사진 */}
                                                {hasExtra(m) && getExtraLinks(m.extra_link).map((url, ei) => (
                                                  <a key={ei} href={url} target="_blank" rel="noopener noreferrer" style={{ flexShrink: 0 }}>
                                                    <img src={url} alt={`Day ${day} 추가활동 ${ei + 1}`} style={{ width: 100, height: 75, objectFit: "cover", borderRadius: 10, border: "1px solid rgba(245,158,11,0.3)", display: "block" }} />
                                                  </a>
                                                ))}
                                                {/* 텍스트 정보 */}
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                  {m.link && (
                                                    <div style={{ marginBottom: 6 }}>
                                                      <span style={{ fontSize: 11, fontWeight: 700, color: C.muted }}>인증 링크</span>
                                                      <a href={m.link} target="_blank" rel="noopener noreferrer" style={{ display: "block", fontSize: 12, color: PRIMARY, wordBreak: "break-all", marginTop: 2, textDecoration: "none" }}>{m.link}</a>
                                                    </div>
                                                  )}
                                                  {m.body && (
                                                    <div style={{ marginBottom: 6 }}>
                                                      <span style={{ fontSize: 11, fontWeight: 700, color: C.muted }}>메모</span>
                                                      <div style={{ fontSize: 12, color: C.text, marginTop: 2, lineHeight: 1.5 }}>{m.body}</div>
                                                    </div>
                                                  )}
                                                  <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
                                                    등록: {new Date(m.created_at).toLocaleString("ko-KR")}
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );})()}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>)
        )}
      </div>
    </div>
  );
}

/* ═══ Editor ═══════════════════════════════════════════════ */
function Editor({ ch, C, bdr, card, isDark, mob, user, onBack, onSave, onDelete }) {
  const [f, sf] = useState(ch || {
    title: "", subtitle: "", description: "", thumbnail: "", start_date: "", end_date: "", recruit_start: "", recruit_end: "",
    price: 0, max_participants: 0, duration: "10", platform: "모든 SNS", daily_mission: "매일 1포스팅",
    target_audience: "", process: "", rules: "", rewards: "", refund_policy: "", community_link: "", status: "recruiting", type: "challenge", application_count: 0, host_name: user?.nick || "", badge_image: "", badge_title: "",
  });
  const [saving, setSaving] = useState(false);
  const [thumb, setThumb] = useState(ch?.thumbnail || "");
  const up = (k, v) => sf(p => ({ ...p, [k]: v }));
  const inp = { width: "100%", padding: "12px 16px", borderRadius: 10, border: "1px solid " + bdr, background: isDark ? "rgba(255,255,255,0.06)" : "#fff", color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
  const ta = { ...inp, resize: "vertical", minHeight: 90 };

  const handleThumb = async e => {
    const file = e.target.files?.[0]; if (!file) return;
    const r = new FileReader(); r.onload = ev => setThumb(ev.target.result); r.readAsDataURL(file);
    try { const url = await uploadFileToStorage(file, `challenges/thumb_${Date.now()}.${file.name.split(".").pop()}`); up("thumbnail", url); } catch(err) { alert("업로드 실패: " + err.message); }
  };

  return (
    <div style={{ background: isDark ? "transparent" : "#f9fafb", minHeight: "calc(100vh - 64px)" }}>
      <div style={{ maxWidth: 660, margin: "0 auto", padding: mob ? "24px 16px 80px" : "48px 20px 100px" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: C.muted, fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 24, display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg> 목록으로
        </button>
        <div style={{ background: card, border: "1px solid " + bdr, borderRadius: 24, padding: mob ? "28px 20px" : "40px 36px", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 32 }}>{ch ? "성장 프로그램 수정" : "새 성장 프로그램"}</h2>

          <Fld label="제목 *" C={C}><input value={f.title} onChange={e => up("title", e.target.value)} placeholder="예: SNS 수익화 10일 성장 프로그램" style={inp} /></Fld>
          <Fld label="한줄 소개" C={C}><input value={f.subtitle} onChange={e => up("subtitle", e.target.value)} placeholder="카드에 표시될 짧은 설명" style={inp} /></Fld>
          <Fld label="썸네일" C={C}>{thumb && <img src={thumb} alt="" style={{ width: "100%", maxHeight: 200, objectFit: "cover", borderRadius: 14, marginBottom: 10, display: "block" }} />}<input type="file" accept="image/*" onChange={handleThumb} style={{ fontSize: 13 }} /></Fld>
          <Fld label="상세 설명 (이미지 삽입 가능)" C={C}><RichEditor value={f.description} onChange={v => up("description", v)} isDark={isDark} /></Fld>
          <Fld label="추천 대상" C={C}><RichEditor value={f.target_audience} onChange={v => up("target_audience", v)} isDark={isDark} /></Fld>
          <Fld label="진행 방식" C={C}><RichEditor value={f.process} onChange={v => up("process", v)} isDark={isDark} /></Fld>
          <Fld label="규칙" C={C}><RichEditor value={f.rules} onChange={v => up("rules", v)} isDark={isDark} /></Fld>
          <Fld label="보상 구조" C={C}><RichEditor value={f.rewards} onChange={v => up("rewards", v)} isDark={isDark} /></Fld>
          <Fld label="환불 정책" C={C}><RichEditor value={f.refund_policy} onChange={v => up("refund_policy", v)} isDark={isDark} /></Fld>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Fld label="모집 시작" C={C}><input type="date" value={f.recruit_start} onChange={e => up("recruit_start", e.target.value)} style={inp} /></Fld>
            <Fld label="모집 마감" C={C}><input type="date" value={f.recruit_end} onChange={e => up("recruit_end", e.target.value)} style={inp} /></Fld>
            <Fld label="성장 프로그램 시작" C={C}><input type="date" value={f.start_date} onChange={e => up("start_date", e.target.value)} style={inp} /></Fld>
            <Fld label="성장 프로그램 종료" C={C}><input type="date" value={f.end_date} onChange={e => up("end_date", e.target.value)} style={inp} /></Fld>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <Fld label="참가비 (원)" C={C}><input type="number" value={f.price} onChange={e => up("price", +e.target.value)} style={inp} /></Fld>
            <Fld label="최대 인원" C={C}><input type="number" value={f.max_participants} onChange={e => up("max_participants", +e.target.value)} style={inp} /></Fld>
            <Fld label="기간 (일)" C={C}><input value={f.duration} onChange={e => up("duration", e.target.value)} style={inp} /></Fld>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Fld label="플랫폼" C={C}><input value={f.platform} onChange={e => up("platform", e.target.value)} style={inp} /></Fld>
            <Fld label="일일 미션" C={C}><input value={f.daily_mission} onChange={e => up("daily_mission", e.target.value)} style={inp} /></Fld>
          </div>
          <Fld label="진행자 이름" C={C}><input value={f.host_name || ""} onChange={e => up("host_name", e.target.value)} placeholder="성장 프로그램 진행자 이름" style={inp} /></Fld>
          <Fld label="커뮤니티 링크" C={C}><input value={f.community_link} onChange={e => up("community_link", e.target.value)} placeholder="카카오 오픈채팅, 디스코드 등" style={inp} /></Fld>
          <Fld label="달성 뱃지" C={C}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              {f.badge_image && <img src={f.badge_image} alt="뱃지" style={{ width: 64, height: 64, objectFit: "contain", borderRadius: 8 }} />}
              <div style={{ flex: 1 }}>
                <input value={f.badge_title || ""} onChange={e => up("badge_title", e.target.value)} placeholder="뱃지 이름 (예: SNS 성장 프로그램 2기)" style={{ ...inp, marginBottom: 8 }} />
                <input value={f.badge_image || ""} onChange={e => up("badge_image", e.target.value)} placeholder="뱃지 이미지 URL" style={inp} />
                <input type="file" accept="image/*" style={{ marginTop: 8, fontSize: 12 }} onChange={async e => {
                  const file = e.target.files?.[0]; if (!file) return;
                  const path = `badges/badge_${Date.now()}.${file.name.split(".").pop()}`;
                  const { error } = await uploadFileToStorage("public-assets", path, file);
                  if (!error) { const url = `https://ckzjnpzadeovrasucjmu.supabase.co/storage/v1/object/public/public-assets/${path}`; up("badge_image", url); }
                }} />
              </div>
            </div>
          </Fld>
          <Fld label="유형" C={C}>
            <div style={{ display: "flex", gap: 8 }}>
              {[["challenge", "성장 프로그램"], ["class", "클래스"], ["meetup", "모임"], ["study", "스터디"]].map(([v, l]) => {
                const tc = TYPE_MAP[v]?.color || PRIMARY;
                return (
                  <button key={v} onClick={() => up("type", v)}
                    style={{ flex: 1, padding: "10px", borderRadius: 10, border: `1.5px solid ${f.type === v ? tc : bdr}`, background: f.type === v ? tc + "12" : "transparent", color: f.type === v ? tc : C.muted, fontSize: 13, fontWeight: f.type === v ? 700 : 500, cursor: "pointer", fontFamily: "inherit" }}>{l}</button>
                );
              })}
            </div>
          </Fld>
          <Fld label="상태" C={C}>
            <div style={{ display: "flex", gap: 8 }}>
              {[["recruiting", "모집중"], ["ongoing", "진행중"], ["completed", "완료"]].map(([v, l]) => {
                const sc = STATUS_MAP[v]?.color || PRIMARY;
                return <button key={v} onClick={() => up("status", v)} style={{ flex: 1, padding: "10px", borderRadius: 99, border: "1.5px solid " + (f.status === v ? sc : bdr), background: f.status === v ? sc + "12" : "transparent", color: f.status === v ? sc : C.muted, fontSize: 13, fontWeight: f.status === v ? 700 : 500, cursor: "pointer", fontFamily: "inherit" }}>{l}</button>;
              })}
            </div>
          </Fld>

          <div style={{ display: "flex", gap: 10, marginTop: 32 }}>
            {ch?.id && <button onClick={() => onDelete(ch.id)} style={{ padding: "14px 24px", borderRadius: 99, border: "1px solid rgba(239,68,68,0.2)", background: "transparent", color: "#ef4444", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>삭제</button>}
            <button disabled={!f.title || saving} onClick={async () => { setSaving(true); await onSave(f); setSaving(false); }}
              style={{ flex: 1, padding: "16px", borderRadius: 99, border: "none", background: f.title ? PRIMARY : (isDark ? "rgba(255,255,255,0.1)" : "#e5e7eb"), color: f.title ? "#fff" : C.muted, fontSize: 16, fontWeight: 700, cursor: f.title ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
              {saving ? "저장 중..." : "저장하기"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
