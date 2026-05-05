import { useState, useEffect, useRef } from "react";
import { supabase, uploadFileToStorage } from "./storage";
import { RichEditor } from "./BoardComponents.jsx";
import DOMPurify from "dompurify";

/* ── 상수 / 헬퍼 ──────────────────────────────────────── */
const PRIMARY = "#3b82f6";
const fmt = d => d ? new Date(d).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" }) : "";
const dday = d => { if (!d) return ""; const diff = Math.ceil((new Date(d) - new Date()) / 86400000); return diff > 0 ? `D-${diff}` : diff === 0 ? "D-DAY" : "마감"; };
const STATUS_MAP = {
  recruiting: { label: "모집중", color: "#22c55e", bg: "rgba(34,197,94,0.1)" },
  ongoing:    { label: "진행중", color: PRIMARY,   bg: "rgba(59,130,246,0.1)" },
  completed:  { label: "완료",   color: "#6b7280", bg: "rgba(107,114,128,0.1)" },
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
async function loadPublicApplicants(cid) {
  const { data, error } = await supabase.rpc("get_challenge_participants", { p_challenge_id: cid });
  if (!error) return data || [];
  const { data: fb } = await supabase.from("challenge_applications").select("id,name,status,created_at").eq("challenge_id", cid).order("created_at", { ascending: true });
  return fb || [];
}
async function loadMissions(cid) { const { data } = await supabase.from("challenge_missions").select("*").eq("challenge_id", cid).order("created_at", { ascending: false }); return data || []; }
async function submitMission(m) { const row = { ...m, id: "cm_" + Date.now(), created_at: new Date().toISOString() }; await supabase.from("challenge_missions").insert(row); return row; }

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
    const title = `${ch.title} - SNS메이킷 부트캠프`;
    const desc = (ch.subtitle || ch.description?.replace(/<[^>]*>/g, "") || "").slice(0, 155);
    const url = `https://snsmakeit.com/challenge/${ch.id}`;
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
  const resetSeo = () => { document.title = "부트캠프 - SNS메이킷"; };

  useEffect(() => {
    (async () => {
      try {
        const data = await loadChallenges();
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
    window.history.pushState(null, "", "/challenge/" + ch.id);
    updateSeo(ch);
    if (user?.uid) setMyApp(await loadMyApplication(ch.id, user.uid));
    try { setPublicApps(await loadPublicApplicants(ch.id)); } catch { setPublicApps([]); }
  };
  const openBoard = async ch => { setSel(ch); try { setMissions(await loadMissions(ch.id)); } catch { setMissions([]); } setView("board"); window.scrollTo(0, 0); };
  const openAdmin = async ch => { if (!isAdmin) return; setSel(ch); try { setApps(await loadApplications(ch.id)); } catch { setApps([]); } setView("admin"); window.scrollTo(0, 0); };
  const back = () => { setView("list"); setSel(null); setMyApp(null); window.history.pushState(null, "", "/challenge"); resetSeo(); window.scrollTo(0, 0); };
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
            <span style={{ background: `linear-gradient(135deg, ${PRIMARY}, #60a5fa)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>SNS 부트캠프</span>
          </h1>
          <p style={{ fontSize: mob ? 14 : 17, color: "#4a5568", lineHeight: 1.7, marginBottom: 32 }}>
            챌린지, 스터디, 모임까지 다양한 프로그램을 운영합니다.<br/>
            함께 실행하고, 서로 피드백하며 성장하세요.
          </p>
          {isAdmin && (
            <button onClick={() => { setSel(null); setView("editor"); }}
              style={{ padding: "16px 36px", borderRadius: 99, border: "none", background: "#1A1A2E", color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer", transition: "transform 0.18s", fontFamily: "inherit" }}
              onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"} onMouseLeave={e => e.currentTarget.style.transform = "none"}>
              + 새 챌린지 만들기
            </button>
          )}
        </div>
      </div>

      {/* 카드 그리드 */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: mob ? "32px 16px 80px" : "48px 20px 100px" }}>
        {challenges.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 20px", color: C.muted }}>
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="1" strokeLinecap="round" style={{ margin: "0 auto 20px", display: "block", opacity: 0.25 }}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 8 }}>아직 등록된 챌린지가 없어요</div>
            <div style={{ fontSize: 14 }}>곧 새로운 챌린지가 시작될 예정입니다</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill,minmax(${mob ? "100%" : "340px"},1fr))`, gap: 24 }}>
            {challenges.map(ch => {
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
                        [<svg key="u" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>, ch.host_name || `${ch.application_count || 0}명`],
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

          {/* 빠른 이동 */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 36, padding: "16px 0", borderBottom: "1px solid " + bdr }}>
            {[
              ...(isParticipant ? [["미션 게시판", () => openBoard(ch)]] : []),
              ["현황판", () => document.getElementById("public-board")?.scrollIntoView({ behavior: "smooth" })],
              ["챌린지 개요", () => document.getElementById("sect-overview")?.scrollIntoView({ behavior: "smooth" })],
              ...(canApply && !hasApplied ? [["신청하기", () => document.getElementById("cta-section")?.scrollIntoView({ behavior: "smooth" })]] : []),
              ...(isAdmin ? [["신청자 관리", () => openAdmin(ch)]] : []),
            ].map(([label, fn], i) => (
              <button key={i} onClick={fn}
                style={{ padding: "9px 20px", borderRadius: 99, border: "1px solid " + bdr, background: i === 0 && isParticipant ? PRIMARY : "transparent", color: i === 0 && isParticipant ? "#fff" : C.text, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}
                onMouseEnter={e => { if (!(i === 0 && isParticipant)) { e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)"; } }}
                onMouseLeave={e => { if (!(i === 0 && isParticipant)) { e.currentTarget.style.background = "transparent"; } }}>
                {label}
              </button>
            ))}
          </div>

          {/* 콘텐츠 섹션들 */}
          <div id="sect-overview" />
          {ch.description && <Sect title="챌린지 개요" C={C} bdr={bdr}><div style={{ fontSize: 14, color: C.text, lineHeight: 1.9 }} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(ch.description) }} /></Sect>}
          {ch.target_audience && <Sect title="이런 사람에게 추천해요" C={C} bdr={bdr}><div style={{ fontSize: 14, color: C.text, lineHeight: 1.9 }} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(ch.target_audience) }} /></Sect>}
          {ch.process && <Sect title="진행 방식" C={C} bdr={bdr}><div style={{ fontSize: 14, color: C.text, lineHeight: 1.9 }} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(ch.process) }} /></Sect>}
          {ch.rules && <Sect title="규칙" C={C} bdr={bdr}><div style={{ fontSize: 14, color: C.text, lineHeight: 1.9 }} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(ch.rules) }} /></Sect>}
          {ch.rewards && <Sect title="보상 구조" C={C} bdr={bdr}><div style={{ fontSize: 14, color: C.text, lineHeight: 1.9 }} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(ch.rewards) }} /></Sect>}
          {ch.refund_policy && <Sect title="환불 정책" C={C} bdr={bdr}><div style={{ fontSize: 14, color: C.muted, lineHeight: 1.9 }} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(ch.refund_policy) }} /></Sect>}

          {/* CTA */}
          <div id="cta-section" style={{ background: "linear-gradient(135deg, #E8F0FF, rgba(59,130,246,0.08))", border: "1px solid rgba(59,130,246,0.12)", borderRadius: 24, padding: mob ? "36px 20px" : "52px 40px", textAlign: "center", marginTop: 44 }}>
            <div style={{ fontSize: mob ? 20 : 28, fontWeight: 700, color: "#1a1a1a", marginBottom: 14 }}>
              {isParticipant ? "미션 게시판에 입장하세요" : hasApplied ? "신청이 완료되었습니다" : canApply ? "지금 바로 신청하세요" : "다음 챌린지를 기대해주세요"}
            </div>
            {isParticipant ? (
              <button onClick={() => openBoard(ch)} style={ctaBtn(PRIMARY)}>미션 게시판 입장</button>
            ) : hasApplied ? (
              <p style={{ fontSize: 14, color: "#4a5568" }}>관리자 확인 후 참여가 확정됩니다</p>
            ) : canApply ? (
              <button onClick={() => { setView("apply"); window.scrollTo(0, 0); }} style={ctaBtn("#1A1A2E")}>신청하기</button>
            ) : null}
            {isAdmin && <button onClick={() => openAdmin(ch)} style={{ ...ctaBtn("transparent"), border: "1px solid " + bdr, color: C.muted, marginLeft: 12, boxShadow: "none" }}>관리자 보기</button>}
          </div>

          {/* 참여자 현황 - 누구나 볼 수 있음 */}
          {publicApps.length > 0 && (
            <div style={{ marginTop: 48 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 6 }}>참여자 현황</h2>
              <p style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>총 {publicApps.length}명 신청</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {publicApps.map(a => {
                  const isConfirmed = a.status === "confirmed";
                  return (
                    <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 12, border: "1px solid " + bdr, background: card }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: isConfirmed ? PRIMARY : "#f59e0b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{(a.name || "?")[0]}</div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{a.name}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: isConfirmed ? "#22c55e" : "#f59e0b", background: isConfirmed ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.1)", padding: "2px 8px", borderRadius: 99 }}>{isConfirmed ? "확정" : "대기중"}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 공개 현황판 - 검색엔진 노출용 (누구나 열람 가능) */}
          <div id="public-board" />
          <PublicLinkBoard challengeId={ch.id} C={C} bdr={bdr} card={card} isDark={isDark} mob={mob} title={ch.title} isAdmin={isAdmin} />
        </div>
      </div>
    );
  }

  /* ═══ APPLY ══════════════════════════════════════════════ */
  if (view === "apply" && sel) return <ApplyForm ch={sel} C={C} bdr={bdr} card={card} isDark={isDark} mob={mob} user={user}
    onBack={() => { setView("detail"); window.scrollTo(0, 0); }}
    onSubmit={async fd => {
      const app = await submitApplication({ ...fd, challenge_id: sel.id, uid: user?.uid || "guest_" + Date.now() });
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
          {sel.start_date && <><br/>챌린지 시작일: <strong style={{ color: C.text }}>{fmt(sel.start_date)}</strong></>}
        </p>
        <div style={{ marginTop: 16 }}>
          <button onClick={back} style={{ padding: "12px 28px", borderRadius: 99, border: "1px solid " + bdr, background: "transparent", color: C.muted, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>목록으로</button>
        </div>
      </div>
    </div>
  );

  /* ═══ BOARD ══════════════════════════════════════════════ */
  if (view === "board" && sel) return <MissionBoard ch={sel} C={C} bdr={bdr} card={card} isDark={isDark} mob={mob} user={user} missions={missions} setMissions={setMissions} onBack={() => { setView("detail"); window.scrollTo(0, 0); }} />;

  /* ═══ ADMIN ══════════════════════════════════════════════ */
  if (view === "admin" && sel) return <AdminPanel ch={sel} C={C} bdr={bdr} card={card} isDark={isDark} mob={mob} apps={apps} setApps={setApps} onBack={() => { setView("detail"); window.scrollTo(0, 0); }} onEdit={() => { setView("editor"); window.scrollTo(0, 0); }}
    onStatus={async (id, s) => { await updateApplicationStatus(id, s); setApps(p => p.map(a => a.id === id ? { ...a, status: s } : a)); showToast(s === "confirmed" ? "참여 확정!" : "상태 변경 완료"); }}
    onDelete={async (id) => { if (!confirm("이 신청자를 삭제하시겠습니까?")) return; await supabase.from("challenge_applications").delete().eq("id", id); setApps(p => p.filter(a => a.id !== id)); const newCount = Math.max(0, (sel.application_count || 1) - 1); await supabase.from("challenges").update({ application_count: newCount }).eq("id", sel.id); setSel(p => ({ ...p, application_count: newCount })); showToast("신청자 삭제 완료"); }} />;

  /* ═══ EDITOR ═════════════════════════════════════════════ */
  if (view === "editor") return <Editor ch={sel} C={C} bdr={bdr} card={card} isDark={isDark} mob={mob} user={user} onBack={back}
    onSave={async fd => { if (!fd.host_name && user?.nick) fd.host_name = user.nick; const s = await saveChallenge(fd); setChallenges(p => { const e = p.find(c => c.id === s.id); return e ? p.map(c => c.id === s.id ? s : c) : [s, ...p]; }); showToast("저장 완료"); back(); }}
    onDelete={async id => { if (!confirm("정말 삭제하시겠습니까?")) return; await deleteChallenge(id); setChallenges(p => p.filter(c => c.id !== id)); showToast("삭제 완료"); back(); }} />;

  return null;
}

/* ── 공통 CTA 버튼 스타일 ── */
function ctaBtn(bg) {
  return { padding: "16px 40px", borderRadius: 99, border: "none", background: bg, color: "#fff", fontSize: 17, fontWeight: 700, cursor: "pointer", boxShadow: bg === "#1A1A2E" ? "0 4px 16px rgba(0,0,0,0.15)" : `0 4px 16px ${bg}40`, fontFamily: "inherit", transition: "transform 0.18s" };
}

/* ── 섹션 ── */
function Sect({ title, children, C, bdr }) {
  return <div style={{ marginBottom: 36 }}>
    <h3 style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid " + bdr }}>{title}</h3>
    {children}
  </div>;
}

/* ── 필드 ── */
function Fld({ label, children, C }) {
  return <div style={{ marginBottom: 20 }}><div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 8 }}>{label}</div>{children}</div>;
}

/* ═══ ApplyForm ════════════════════════════════════════════ */
function ApplyForm({ ch, C, bdr, card, isDark, mob, user, onBack, onSubmit }) {
  const [f, sf] = useState({ name: user?.nick || "", phone: "", email: user?.email || "", sns_link: "", purpose: "", payment_method: ch.price > 0 ? "later" : "free", agree_rules: false, agree_refund: false });
  const [busy, setBusy] = useState(false);
  const up = (k, v) => sf(p => ({ ...p, [k]: v }));
  const inp = { width: "100%", padding: "12px 16px", borderRadius: 10, border: "1px solid " + bdr, background: isDark ? "rgba(255,255,255,0.06)" : "#fff", color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
  const phoneValid = /^01[016789]-\d{3,4}-\d{4}$/.test(f.phone);
  const ok = f.name && phoneValid && f.email && f.purpose && f.agree_rules && (ch.price > 0 ? f.agree_refund : true);

  return (
    <div style={{ background: isDark ? "transparent" : "#f9fafb", minHeight: "calc(100vh - 64px)" }}>
      <div style={{ maxWidth: 560, margin: "0 auto", padding: mob ? "24px 16px 80px" : "48px 20px 100px" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: C.muted, fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 24, display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg> 뒤로
        </button>
        <div style={{ background: card, border: "1px solid " + bdr, borderRadius: 24, padding: mob ? "28px 20px" : "40px 36px", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 6 }}>{ch.title}</h2>
          <p style={{ fontSize: 13, color: C.muted, marginBottom: 32 }}>챌린지 참가 신청</p>

          <Fld label="이름 *" C={C}><input value={f.name} onChange={e => up("name", e.target.value)} placeholder="이름" style={inp} /></Fld>
          <Fld label="연락처 *" C={C}><input value={f.phone} onChange={e => {
            const v = e.target.value.replace(/[^0-9]/g, "").slice(0, 11);
            const formatted = v.length <= 3 ? v : v.length <= 7 ? v.slice(0,3) + "-" + v.slice(3) : v.slice(0,3) + "-" + v.slice(3,7) + "-" + v.slice(7);
            up("phone", formatted);
          }} placeholder="010-0000-0000" style={inp} inputMode="tel" maxLength={13} /></Fld>
          <Fld label="이메일 *" C={C}><input value={f.email} onChange={e => up("email", e.target.value)} placeholder="email@example.com" style={inp} /></Fld>
          <Fld label="SNS 계정 링크" C={C}><input value={f.sns_link} onChange={e => up("sns_link", e.target.value)} placeholder="블로그, 인스타그램 등" style={inp} /></Fld>
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
              챌린지 규칙에 동의합니다 <span style={{ color: "#ef4444" }}>*</span>
            </label>
            {ch.price > 0 && <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13, color: C.text }}>
              <input type="checkbox" checked={f.agree_refund} onChange={e => up("agree_refund", e.target.checked)} style={{ width: 18, height: 18, accentColor: PRIMARY }} />
              환불 정책에 동의합니다 <span style={{ color: "#ef4444" }}>*</span>
            </label>}
          </div>

          <button disabled={!ok || busy} onClick={async () => { setBusy(true); try { await onSubmit(f); } catch(e) { alert("오류: " + e.message); } setBusy(false); }}
            style={{ width: "100%", padding: "16px", borderRadius: 99, border: "none", background: ok ? "#1A1A2E" : (isDark ? "rgba(255,255,255,0.1)" : "#e5e7eb"), color: ok ? "#fff" : C.muted, fontSize: 16, fontWeight: 700, cursor: ok ? "pointer" : "not-allowed", marginTop: 28, opacity: busy ? 0.7 : 1, fontFamily: "inherit" }}>
            {busy ? "신청 중..." : "참여하기"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══ MissionBoard ═════════════════════════════════════════ */
function MissionBoard({ ch, C, bdr, card, isDark, mob, user, missions, setMissions, onBack }) {
  const [selDay, setSelDay] = useState(null);
  const [link, setLink] = useState("");
  const [memo, setMemo] = useState("");
  const [extraLink, setExtraLink] = useState(""); // 추가 활동 (댓글/공감/공유 스크린샷)
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("calendar");
  const inp = { width: "100%", padding: "12px 16px", borderRadius: 10, border: "1px solid " + bdr, background: isDark ? "rgba(255,255,255,0.06)" : "#fff", color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };

  const totalDays = parseInt(ch.duration) || 10;
  const startDate = ch.start_date ? new Date(ch.start_date) : new Date();
  const todayNum = Math.max(1, Math.min(totalDays, Math.ceil((new Date() - startDate) / 86400000)));
  const dayDate = d => { const dt = new Date(startDate); dt.setDate(dt.getDate() + d - 1); return dt; };

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

  // 인증 제출
  const submit = async () => {
    if (!link.trim() || !selDay) return; setBusy(true);
    try {
      const m = await submitMission({ challenge_id: ch.id, uid: user.uid, nick: user.nick || "참가자", day: selDay, title: `Day ${selDay} 미션 인증`, body: memo.trim(), link: link.trim(), extra_link: extraLink.trim() || null });
      setMissions(p => [m, ...p]); setLink(""); setMemo(""); setExtraLink(""); setSelDay(null);
    } catch(e) { alert("등록 실패: " + e.message); }
    setBusy(false);
  };

  // Day 셀의 날짜 포맷
  const fmtShort = d => `${d.getMonth() + 1}/${d.getDate()}`;
  const isToday = d => d === todayNum;
  const isPast = d => d < todayNum;
  const isFuture = d => d > todayNum;
  const isWeekend = d => { const dt = dayDate(d); const dow = dt.getDay(); return dow === 0 || dow === 6; };
  const dayLabel = d => { const dt = dayDate(d); return ["일","월","화","수","목","금","토"][dt.getDay()]; };

  // 점수 계산: 평일 인증=1점, 주말 인증=2점(보너스), 추가활동=+0.5점
  const calcScore = (missionsByDay) => {
    let score = 0;
    Object.entries(missionsByDay).forEach(([d, m]) => {
      score += isWeekend(Number(d)) ? 2 : 1;
      if (m.extra_link) score += 0.5;
    });
    return score;
  };
  const myScore = calcScore(myMissions);

  return (
    <div style={{ background: isDark ? "transparent" : "#f9fafb", minHeight: "calc(100vh - 64px)" }}>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: mob ? "24px 16px 80px" : "40px 20px 100px" }}>
        {/* 헤더 */}
        <button onClick={onBack} style={{ background: "none", border: "none", color: C.muted, fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 16, display: "flex", alignItems: "center", gap: 4, fontFamily: "inherit" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg> 챌린지 상세로
        </button>
        <h2 style={{ fontSize: mob ? 20 : 24, fontWeight: 700, color: C.text, marginBottom: 4 }}>{ch.title}</h2>
        <p style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>{ch.daily_mission || "매일 미션을 수행하고 인증 링크를 등록하세요"}</p>

        {/* 진행률 바 */}
        <div style={{ background: card, border: "1px solid " + bdr, borderRadius: 16, padding: "20px 22px", marginBottom: 24, boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>내 진행률</span>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 12, color: "#f59e0b", fontWeight: 700 }}>{myScore}점</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: PRIMARY }}>{myChecked}/{totalDays}일 ({pct}%)</span>
            </div>
          </div>
          <div style={{ width: "100%", height: 8, borderRadius: 99, background: isDark ? "rgba(255,255,255,0.06)" : "#e5e7eb", overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: 99, background: `linear-gradient(90deg, ${PRIMARY}, #60a5fa)`, width: `${pct}%`, transition: "width 0.4s ease" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 11, color: C.muted }}>
            <span>Day 1</span>
            <span>현재 Day {todayNum}</span>
            <span>Day {totalDays}</span>
          </div>
        </div>

        {/* 탭 */}
        <div style={{ display: "flex", gap: 0, marginBottom: 24, borderBottom: "1px solid " + bdr }}>
          {[["calendar", "날짜별 체크"], ["members", "참가자 현황"], ["feed", "전체 피드"], ["my", "내 기록"], ["board", "자유게시판"]].map(([v, l]) => (
            <button key={v} onClick={() => setTab(v)} style={{ padding: "12px 20px", border: "none", cursor: "pointer", fontSize: 14, fontWeight: tab === v ? 700 : 500, background: "transparent", color: tab === v ? PRIMARY : C.muted, borderBottom: tab === v ? `2px solid ${PRIMARY}` : "2px solid transparent", marginBottom: -1, fontFamily: "inherit", transition: "all 0.15s" }}>{l}</button>
          ))}
        </div>

        {/* ── 탭: 날짜별 캘린더 체크 ── */}
        {tab === "calendar" && (
          <div>
            {/* Day 그리드 */}
            <div style={{ display: "grid", gridTemplateColumns: mob ? "repeat(5, 1fr)" : "repeat(7, 1fr)", gap: 8, marginBottom: 24 }}>
              {Array.from({ length: totalDays }, (_, i) => i + 1).map(d => {
                const checked = !!myMissions[d];
                const today = isToday(d);
                const past = isPast(d);
                const missed = past && !checked && !isWeekend(d); // 주말 미인증은 miss 아님
                const weekendMissed = past && !checked && isWeekend(d);
                const dt = dayDate(d);
                const allCount = (allByDay[d] || []).length;
                const wknd = isWeekend(d);
                return (
                  <div key={d} onClick={() => setSelDay(selDay === d ? null : d)}
                    style={{
                      borderRadius: 14, padding: mob ? "10px 4px" : "12px 8px", textAlign: "center", cursor: "pointer",
                      border: selDay === d ? `2px solid ${PRIMARY}` : today ? `2px solid ${PRIMARY}40` : `1px solid ${bdr}`,
                      background: checked && wknd ? "rgba(245,158,11,0.08)" : checked ? "rgba(59,130,246,0.06)" : missed ? "rgba(239,68,68,0.04)" : wknd ? (isDark ? "rgba(245,158,11,0.03)" : "rgba(245,158,11,0.03)") : card,
                      transition: "all 0.15s", position: "relative",
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
            </div>

            {/* 선택된 Day 상세 + 링크 등록 */}
            {selDay && (
              <div style={{ background: card, border: "1px solid " + bdr, borderRadius: 20, padding: mob ? "20px 16px" : "28px 24px", boxShadow: "0 1px 2px rgba(0,0,0,0.04)", marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: PRIMARY, background: "rgba(59,130,246,0.08)", padding: "5px 14px", borderRadius: 99 }}>Day {selDay}</span>
                    <span style={{ fontSize: 13, color: C.muted }}>{dayDate(selDay).toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" })}</span>
                  </div>
                  <button onClick={() => setSelDay(null)} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 18 }}>x</button>
                </div>

                {/* 내 인증 상태 */}
                {myMissions[selDay] ? (
                  <div style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)", borderRadius: 12, padding: "14px 18px", marginBottom: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "#22c55e" }}>인증 완료</span>
                    </div>
                    <a href={myMissions[selDay].link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: PRIMARY, wordBreak: "break-all" }}>{myMissions[selDay].link}</a>
                    {myMissions[selDay].body && <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>{myMissions[selDay].body}</div>}
                  </div>
                ) : (selDay <= todayNum && user) ? (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>인증 링크 등록</span>
                      {isWeekend(selDay) && <span style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b", background: "rgba(245,158,11,0.1)", padding: "2px 8px", borderRadius: 99 }}>주말 보너스 x2</span>}
                    </div>
                    <input value={link} onChange={e => setLink(e.target.value)} placeholder="블로그 글, 인스타 포스팅 URL 등" style={{ ...inp, marginBottom: 8 }} />
                    <input value={memo} onChange={e => setMemo(e.target.value)} placeholder="메모 (선택)" style={{ ...inp, marginBottom: 8 }} />
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#f59e0b", marginBottom: 6, marginTop: 4 }}>추가 활동 (가산점 +0.5점)</div>
                    <input value={extraLink} onChange={e => setExtraLink(e.target.value)} placeholder="댓글/공감/공유 활동 스크린샷 or 링크 (선택)" style={{ ...inp, marginBottom: 12 }} />
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <button disabled={!link.trim() || busy} onClick={submit}
                        style={{ padding: "11px 24px", borderRadius: 99, border: "none", background: link.trim() ? "#1A1A2E" : (isDark ? "rgba(255,255,255,0.1)" : "#e5e7eb"), color: link.trim() ? "#fff" : C.muted, fontSize: 14, fontWeight: 700, cursor: link.trim() ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
                        {busy ? "등록 중..." : "인증하기"}
                      </button>
                      <span style={{ fontSize: 11, color: C.muted }}>평일 1점 / 주말 2점 / 추가활동 +0.5점</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>{isFuture(selDay) ? "아직 시작되지 않은 Day입니다" : "인증 기간이 지났습니다"}</div>
                )}

                {/* 해당 Day 전체 참가자 인증 목록 */}
                {(allByDay[selDay] || []).length > 0 && (
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 10 }}>Day {selDay} 참가자 인증 ({(allByDay[selDay] || []).length}명)</div>
                    {(allByDay[selDay] || []).map(m => (
                      <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid " + bdr }}>
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: PRIMARY, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{(m.nick || "?")[0]}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{m.nick}</div>
                          {m.link && <a href={m.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: PRIMARY, textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>{m.link}</a>}
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
                )}
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
          return (
            <div>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>총 {members.length}명 참가 중</div>
              {members.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 20px", color: C.muted, border: "1px dashed " + bdr, borderRadius: 16 }}>아직 인증 기록이 없습니다</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {members.map((mem, idx) => {
                    const memberPct = Math.round((mem.count / totalDays) * 100);
                    const memberScore = calcScore(mem.days);
                    return (
                      <div key={mem.uid} style={{ background: card, border: "1px solid " + bdr, borderRadius: 16, padding: "18px 22px", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
                        {/* 참가자 헤더 */}
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                          <div style={{ width: 36, height: 36, borderRadius: "50%", background: idx === 0 ? "#f59e0b" : idx === 1 ? "#94a3b8" : idx === 2 ? "#cd7f32" : PRIMARY, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                            {idx < 3 ? ["1","2","3"][idx] : (mem.nick || "?")[0]}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{mem.nick}</div>
                            <div style={{ fontSize: 12, color: C.muted }}>{mem.count}/{totalDays}일 인증 ({memberPct}%)</div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 20, fontWeight: 700, color: "#f59e0b" }}>{memberScore}점</div>
                            <div style={{ fontSize: 11, color: C.muted }}>{memberPct}%</div>
                          </div>
                        </div>
                        {/* 진행률 바 */}
                        <div style={{ width: "100%", height: 6, borderRadius: 99, background: isDark ? "rgba(255,255,255,0.06)" : "#e5e7eb", marginBottom: 12 }}>
                          <div style={{ height: "100%", borderRadius: 99, background: memberPct >= 80 ? "#22c55e" : `linear-gradient(90deg, ${PRIMARY}, #60a5fa)`, width: `${memberPct}%`, transition: "width 0.4s" }} />
                        </div>
                        {/* Day별 인증 현황 (작은 도트) */}
                        <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                          {Array.from({ length: totalDays }, (_, i) => i + 1).map(d => {
                            const done = !!mem.days[d];
                            const past = d <= todayNum;
                            return (
                              <div key={d} title={`Day ${d}${done ? " - " + (mem.days[d].link || "인증완료") : ""}`}
                                onClick={() => { if (done && mem.days[d].link) window.open(mem.days[d].link, "_blank"); }}
                                style={{ width: mob ? 16 : 20, height: mob ? 16 : 20, borderRadius: 4, fontSize: 8, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", cursor: done ? "pointer" : "default",
                                  background: done ? "rgba(34,197,94,0.15)" : past ? "rgba(239,68,68,0.06)" : (isDark ? "rgba(255,255,255,0.04)" : "#f3f4f6"),
                                  color: done ? "#22c55e" : past ? "rgba(239,68,68,0.3)" : "transparent",
                                  border: d === todayNum ? `1.5px solid ${PRIMARY}` : "none",
                                }}>{d}</div>
                            );
                          })}
                        </div>
                        {/* 최근 인증 링크들 */}
                        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 4 }}>
                          {Object.entries(mem.days).sort(([a],[b]) => Number(b) - Number(a)).slice(0, 3).map(([d, m]) => (
                            m.link ? <div key={d} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                              <span style={{ color: PRIMARY, fontWeight: 700, flexShrink: 0 }}>Day {d}</span>
                              <a href={m.link} target="_blank" rel="noopener noreferrer" style={{ color: C.muted, textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.link}</a>
                            </div> : null
                          ))}
                        </div>
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
                      <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{m.nick}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: PRIMARY, background: "rgba(59,130,246,0.08)", padding: "2px 8px", borderRadius: 99 }}>Day {m.day}</span>
                      {m.extra_link && <span style={{ fontSize: 10, fontWeight: 700, color: "#f59e0b", background: "rgba(245,158,11,0.1)", padding: "2px 6px", borderRadius: 99 }}>+0.5</span>}
                      <span style={{ fontSize: 11, color: C.muted, marginLeft: "auto" }}>{new Date(m.created_at).toLocaleDateString("ko-KR")}</span>
                    </div>
                    {m.body && <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>{m.body}</div>}
                    {m.link && <a href={m.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: PRIMARY, textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>{m.link}</a>}
                    {m.extra_link && <a href={m.extra_link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#f59e0b", textDecoration: "none", display: "block", marginTop: 2 }}>추가활동: {m.extra_link}</a>}
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
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>총 {myChecked}일 인증 완료 / {totalDays}일</div>
            {totalDays > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {Array.from({ length: totalDays }, (_, i) => i + 1).map(d => {
                  const m = myMissions[d];
                  const dt = dayDate(d);
                  const past = d <= todayNum;
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
                        </div>
                        {m?.link && <a href={m.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: PRIMARY, textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block", marginTop: 2 }}>{m.link}</a>}
                        {m?.body && <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{m.body}</div>}
                      </div>
                      {/* 등록 버튼 (미인증 + 오늘 이전) */}
                      {!m && past && user && (
                        <button onClick={() => { setSelDay(d); setTab("calendar"); }}
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
        {user && <button onClick={() => setWriting(!writing)} style={{ padding: "10px 22px", borderRadius: 99, border: "none", background: writing ? C.muted : "#1A1A2E", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{writing ? "취소" : "글쓰기"}</button>}
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
          <div style={{ fontSize: 13 }}>챌린지 참여자끼리 자유롭게 소통해보세요!</div>
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

  const displayLinks = expanded ? links : links.slice(0, 10);

  return (
    <div style={{ marginTop: 48 }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 6 }}>{title} 현황판</h2>
        <p style={{ fontSize: 13, color: C.muted }}>참가자들이 올린 콘텐츠를 확인하세요 ({links.length}개)</p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {displayLinks.map((l, i) => (
          <div key={l.id || i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", borderRadius: 14, border: "1px solid " + bdr, background: card, transition: "all 0.15s", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.06)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 1px 2px rgba(0,0,0,0.04)"; }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: PRIMARY, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{(l.nick || "?")[0]}</div>
            <a href={l.link} target="_blank" rel="noopener noreferrer" style={{ flex: 1, minWidth: 0, textDecoration: "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{l.nick}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: PRIMARY, background: "rgba(59,130,246,0.08)", padding: "1px 8px", borderRadius: 99 }}>Day {l.day}</span>
              </div>
              <div style={{ fontSize: 12, color: PRIMARY, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.link}</div>
            </a>
            {isAdmin && (
              <button onClick={() => deleteLink(l.id)} title="삭제"
                style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(239,68,68,0.5)", padding: 4, flexShrink: 0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
              </button>
            )}
            {!isAdmin && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" style={{ flexShrink: 0 }}><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>}
          </div>
        ))}
      </div>
      {links.length > 10 && !expanded && (
        <button onClick={() => setExpanded(true)}
          style={{ display: "block", margin: "16px auto 0", padding: "10px 28px", borderRadius: 99, border: "1px solid " + bdr, background: "transparent", color: C.muted, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
          전체 {links.length}개 보기
        </button>
      )}
    </div>
  );
}

/* ═══ AdminPanel ═══════════════════════════════════════════ */
function AdminPanel({ ch, C, bdr, card, isDark, mob, apps, onBack, onEdit, onStatus, onDelete }) {
  const SL = { pending: ["대기", "#f59e0b"], paid: ["결제완료", PRIMARY], confirmed: ["참여확정", "#22c55e"], cancelled: ["취소", "#ef4444"] };
  return (
    <div style={{ background: isDark ? "transparent" : "#f9fafb", minHeight: "calc(100vh - 64px)" }}>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: mob ? "24px 16px 80px" : "40px 20px 100px" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: C.muted, fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 24, display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg> 뒤로
        </button>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 4 }}>{ch.title}</h2>
            <p style={{ fontSize: 13, color: C.muted }}>총 {apps.length}명 신청</p>
          </div>
          <button onClick={onEdit} style={{ padding: "10px 22px", borderRadius: 99, border: "1px solid " + bdr, background: "transparent", color: C.text, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>챌린지 수정</button>
        </div>

        {apps.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: C.muted }}><div style={{ fontSize: 15, fontWeight: 700 }}>아직 신청자가 없습니다</div></div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {apps.map(a => {
              const [sl, sc] = SL[a.status] || ["알 수 없음", "#6b7280"];
              return (
                <div key={a.id} style={{ background: card, border: "1px solid " + bdr, borderRadius: 16, padding: "18px 22px", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{a.name}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: sc, background: sc + "15", padding: "3px 12px", borderRadius: 99 }}>{sl}</span>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {a.status !== "confirmed" && <button onClick={() => onStatus(a.id, "confirmed")} style={{ padding: "7px 16px", borderRadius: 99, border: "none", background: "#22c55e", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>확정</button>}
                      <button onClick={() => onDelete(a.id)} style={{ padding: "7px 16px", borderRadius: 99, border: "1px solid rgba(239,68,68,0.3)", background: "transparent", color: "#ef4444", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>삭제</button>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr 1fr", gap: 6, fontSize: 12, color: C.muted }}>
                    <div><strong style={{ color: C.text }}>연락처</strong> {a.phone}</div>
                    <div><strong style={{ color: C.text }}>이메일</strong> {a.email}</div>
                    <div><strong style={{ color: C.text }}>목적</strong> {a.purpose}</div>
                    {a.sns_link && <div style={{ gridColumn: mob ? "1" : "1/4" }}><strong style={{ color: C.text }}>SNS</strong> <a href={a.sns_link} target="_blank" rel="noopener noreferrer" style={{ color: PRIMARY }}>{a.sns_link}</a></div>}
                  </div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 8 }}>{new Date(a.created_at).toLocaleString("ko-KR")}</div>
                </div>
              );
            })}
          </div>
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
    target_audience: "", process: "", rules: "", rewards: "", refund_policy: "", community_link: "", status: "recruiting", application_count: 0, host_name: user?.nick || "",
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
          <h2 style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 32 }}>{ch ? "챌린지 수정" : "새 챌린지"}</h2>

          <Fld label="제목 *" C={C}><input value={f.title} onChange={e => up("title", e.target.value)} placeholder="예: SNS 수익화 10일 챌린지" style={inp} /></Fld>
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
            <Fld label="챌린지 시작" C={C}><input type="date" value={f.start_date} onChange={e => up("start_date", e.target.value)} style={inp} /></Fld>
            <Fld label="챌린지 종료" C={C}><input type="date" value={f.end_date} onChange={e => up("end_date", e.target.value)} style={inp} /></Fld>
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
          <Fld label="진행자 이름" C={C}><input value={f.host_name || ""} onChange={e => up("host_name", e.target.value)} placeholder="챌린지 진행자 이름" style={inp} /></Fld>
          <Fld label="커뮤니티 링크" C={C}><input value={f.community_link} onChange={e => up("community_link", e.target.value)} placeholder="카카오 오픈채팅, 디스코드 등" style={inp} /></Fld>
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
              style={{ flex: 1, padding: "16px", borderRadius: 99, border: "none", background: f.title ? "#1A1A2E" : (isDark ? "rgba(255,255,255,0.1)" : "#e5e7eb"), color: f.title ? "#fff" : C.muted, fontSize: 16, fontWeight: 700, cursor: f.title ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
              {saving ? "저장 중..." : "저장하기"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
