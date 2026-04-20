// SNS 길잡이 — 상담형 챗봇 (사용자 성향 분석 → SNS 전략 추천)
import React, { useState, useRef, useEffect, useCallback } from "react";
import { callAIStream } from "./aiClient";

// ── 보관함 저장 ──
const CONSULTING_SAVES_KEY = "nper_consulting_saves_v1";
function getConsultingSaves() { try { return JSON.parse(localStorage.getItem(CONSULTING_SAVES_KEY) || "[]"); } catch { return []; } }
function saveConsultingWork(item) {
  const list = getConsultingSaves().filter(x => x.id !== item.id);
  list.unshift(item);
  try { localStorage.setItem(CONSULTING_SAVES_KEY, JSON.stringify(list.slice(0, 50))); } catch {}
}
export { getConsultingSaves, saveConsultingWork, CONSULTING_SAVES_KEY };

const MBTI_LIST = [
  "INTJ","INTP","ENTJ","ENTP",
  "INFJ","INFP","ENFJ","ENFP",
  "ISTJ","ISFJ","ESTJ","ESFJ",
  "ISTP","ISFP","ESTP","ESFP",
];

const SNS_OPTIONS = [
  { id:"naver_blog", label:"네이버 블로그", icon:"/icon-naver-blog.png" },
  { id:"instagram", label:"인스타그램", icon:"/icon-instagram.webp" },
  { id:"youtube", label:"유튜브", icon:"/icon-youtube.png" },
  { id:"tiktok", label:"틱톡", icon:"/icon-tiktok.webp" },
  { id:"threads", label:"스레드", icon:"/icon-threads.png" },
  { id:"twitter", label:"X (Twitter)", icon:"/icon-x.png" },
  { id:"facebook", label:"페이스북", icon:"/icon-facebook.webp" },
];

const JOB_OPTIONS = [
  "학생","직장인","프리랜서","자영업","크리에이터","마케터",
  "디자이너","개발자","교육자","의료인","법조인","공무원",
  "주부","취업준비생","기타",
];

const GENDER_OPTIONS = ["남성","여성","기타"];

const HOUR_OPTIONS = (() => {
  const arr = [{ value:"unknown", label:"모름" }];
  for (let h = 0; h < 24; h++) {
    const ampm = h < 12 ? "오전" : "오후";
    const hh = h === 0 ? 12 : h > 12 ? h - 12 : h;
    arr.push({ value: String(h), label: `${ampm} ${hh}시` });
  }
  return arr;
})();

export default function SnsConsulting({ isDark, user }) {
  const accent = "#7c6aff";
  const text = isDark ? "#fff" : "#1a1a2e";
  const muted = isDark ? "rgba(255,255,255,0.5)" : "#888";
  const border = isDark ? "rgba(255,255,255,0.1)" : "#e5e5f0";
  const cardBg = isDark ? "rgba(255,255,255,0.04)" : "#fff";
  const inputBg = isDark ? "rgba(255,255,255,0.06)" : "#f8f8fc";

  // 입력 폼
  const [name, setName] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [birthHour, setBirthHour] = useState("unknown");
  const [gender, setGender] = useState("");
  const [job, setJob] = useState("");
  const [jobCustom, setJobCustom] = useState("");
  const [snsList, setSnsList] = useState([]);
  const [mbti, setMbti] = useState("");
  const [extra, setExtra] = useState(""); // 추가 관심사/목표

  // 채팅
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState("form"); // "form" | "chat"
  const chatEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [saved, setSaved] = useState(false);
  const [shareToast, setShareToast] = useState("");
  const resultRef = useRef(null);

  // 결과 완료 시 자동 보관함 저장
  const autoSave = useCallback((finalText) => {
    const id = `consulting_${Date.now()}`;
    const snsLabels = snsList.map(sid => SNS_OPTIONS.find(s => s.id === sid)?.label || sid).join(", ");
    saveConsultingWork({
      id, title: `${name}님의 SNS 길잡이`,
      content: finalText,
      profile: buildProfile(),
      name, gender, job: job === "기타" ? jobCustom : job,
      mbti, sns: snsLabels,
      date: new Date().toISOString().slice(0, 10),
      type: "consulting",
    });
    setSaved(true);
  }, [name, gender, job, jobCustom, mbti, snsList]);

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const toggleSns = (id) => {
    setSnsList(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const buildProfile = () => {
    const snsLabels = snsList.map(id => SNS_OPTIONS.find(s => s.id === id)?.label || id).join(", ");
    const jobText = job === "기타" ? jobCustom : job;
    const birthInfo = birthYear && birthMonth && birthDay
      ? `${birthYear}년 ${birthMonth}월 ${birthDay}일` + (birthHour !== "unknown" ? ` (${HOUR_OPTIONS.find(h=>h.value===birthHour)?.label})` : "")
      : "미입력";
    return `이름: ${name || "미입력"}
생년월일: ${birthInfo}
성별: ${gender || "미입력"}
직업: ${jobText || "미입력"}
MBTI: ${mbti || "미입력"}
관심 SNS: ${snsLabels || "미입력"}
추가 정보: ${extra || "없음"}`;
  };

  const systemPrompt = `당신은 사주명리학과 성격 분석을 기반으로 SNS 콘텐츠 방향을 잡아주는 전문 상담가입니다.

응답 구조 (3파트):

1) 사주 성향 분석
생년월일+시간 기반 사주팔자 성격/기질을 자연스럽게 서술한 뒤, 아래 표 하나로 요약.

| 항목 | 분석 결과 |
|------|----------|
| 오행 기질 | |
| 핵심 성격 | |
| 표현 스타일 | |
| 강점 | |
| 보완점 | |

2) 나에게 맞는 콘텐츠 주제
어울리는 주제 3~5개를 표 하나로 정리.

| 주제 | 이유 | 추천 형태 |
|------|------|----------|

3) 플랫폼별 실전 전략
선택한 SNS별 전략을 표 하나로 정리하고, 바로 실행할 액션 아이템 2~3개로 마무리.

| 플랫폼 | 콘텐츠 형태 | 빈도 | 톤앤매너 |
|--------|-----------|------|---------|

절대 규칙:
- 같은 말 반복 금지. 한 번 언급한 내용은 다시 쓰지 않는다
- 이모지 사용 금지
- ##, ###, #### 등 마크다운 헤더 태그 사용 금지. 섹션 구분은 --- (수평선)만 사용
- *, -, bullet 리스트 사용 금지. 나열이 필요하면 표로 정리하거나 문장으로 서술
- **bold**도 정말 핵심 키워드 1~2개에만 사용. 남발 금지
- 사주 해석은 현대적이고 공감 가는 톤 (점집 느낌 X)
- 직업은 참고 정보일 뿐이다. 직업에 얽매여 콘텐츠를 추천하지 말 것. 사주/성향/MBTI 분석 결과를 중심으로 그 사람에게 진짜 어울리는 주제를 자유롭게 추천한다. 마케터라고 마케팅 콘텐츠만 추천하면 안 된다
- 한국 시장 기준
- 글이 중간에 끊기지 않도록 완결성 있게 작성
- 간결하게. 설명보다 표 우선`;

  const startConsulting = async () => {
    if (!name.trim()) { alert("이름을 입력해주세요."); return; }
    if (!gender) { alert("성별을 선택해주세요."); return; }
    if (!job) { alert("직업을 선택해주세요."); return; }
    if (snsList.length === 0) { alert("관심 있는 SNS를 1개 이상 선택해주세요."); return; }

    const profile = buildProfile();
    setPhase("chat");
    setLoading(true);

    const userMsg = { role: "user", content: `[사용자 프로필]\n${profile}\n\n위 정보를 바탕으로 사주/성향 분석을 먼저 해주시고, 그 결과를 기반으로 나에게 맞는 SNS 콘텐츠 주제와 방향을 잡아주세요.` };
    setMessages([userMsg]);

    try {
      const finalText = await callAIStream(
        "claude-sonnet-4-20250514",
        [userMsg],
        8000,
        (full) => {
          setMessages([userMsg, { role: "assistant", content: full, streaming: true }]);
        },
        systemPrompt
      );
      setMessages([userMsg, { role: "assistant", content: finalText, streaming: false }]);
      autoSave(finalText);
    } catch (e) {
      setMessages([userMsg, { role: "assistant", content: "죄송합니다. 분석 중 오류가 발생했습니다. 다시 시도해주세요." }]);
    }
    setLoading(false);
  };

  const sendChat = async () => {
    if (!chatInput.trim() || loading) return;
    const newMsg = { role: "user", content: chatInput };
    const allMsgs = [...messages, newMsg];
    setMessages(allMsgs);
    setChatInput("");
    setLoading(true);

    try {
      const finalText = await callAIStream(
        "claude-sonnet-4-20250514",
        [{ role: "user", content: `[사용자 프로필]\n${buildProfile()}` }, ...allMsgs],
        8000,
        (full) => {
          setMessages([...allMsgs, { role: "assistant", content: full, streaming: true }]);
        },
        systemPrompt
      );
      setMessages([...allMsgs, { role: "assistant", content: finalText, streaming: false }]);
    } catch (e) {
      setMessages([...allMsgs, { role: "assistant", content: "응답 생성 중 오류가 발생했습니다." }]);
    }
    setLoading(false);
  };

  const inputStyle = {
    padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${border}`,
    background: inputBg, color: text, fontSize: 14, outline: "none", fontFamily: "inherit",
    width: "100%", transition: "border-color 0.15s",
  };

  const selectStyle = {
    ...inputStyle, cursor: "pointer", appearance: "none",
    backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%23999' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center",
    paddingRight: 32,
  };

  const chipStyle = (active) => ({
    padding: "7px 14px", borderRadius: 20, cursor: "pointer",
    border: active ? `2px solid ${accent}` : `1.5px solid ${border}`,
    background: active ? `${accent}10` : "transparent",
    color: active ? accent : muted,
    fontSize: 13, fontWeight: active ? 700 : 500,
    transition: "all 0.15s", display: "inline-flex", alignItems: "center", gap: 5,
    fontFamily: "inherit",
  });

  const labelStyle = { fontSize: 13, fontWeight: 700, color: text, marginBottom: 6, display: "block" };

  // ── 폼 화면 ──
  if (phase === "form") {
    return (
      <div style={{ flex: 1, overflowY: "auto", background: isDark ? "transparent" : "#f4f4f8" }}>
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "32px 20px 60px" }}>
          {/* 헤더 */}
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ width: 72, height: 72, borderRadius: 20, background: `${accent}10`, margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="1.5" strokeLinecap="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                <path d="M8 10h.01M12 10h.01M16 10h.01" strokeWidth="2"/>
              </svg>
            </div>
            <div style={{ fontSize: 24, fontWeight: 900, color: text, marginBottom: 6 }}>SNS 길잡이</div>
            <div style={{ fontSize: 14, color: muted, lineHeight: 1.7 }}>
              나에게 딱 맞는 SNS 전략을 AI가 분석해드려요<br/>
              아래 정보를 입력하면 맞춤 컨설팅이 시작됩니다
            </div>
          </div>

          {/* 폼 */}
          <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 20, padding: "28px 24px", display: "flex", flexDirection: "column", gap: 20 }}>

            {/* 이름 + 성별 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label style={labelStyle}>이름 (닉네임)</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="홍길동" style={inputStyle}
                  onFocus={e => e.target.style.borderColor = accent} onBlur={e => e.target.style.borderColor = border} />
              </div>
              <div>
                <label style={labelStyle}>성별</label>
                <div style={{ display: "flex", gap: 6 }}>
                  {GENDER_OPTIONS.map(g => (
                    <button key={g} onClick={() => setGender(g)} style={chipStyle(gender === g)}>{g}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* 생년월일 */}
            <div>
              <label style={labelStyle}>생년월일</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 0.7fr 0.7fr 1fr", gap: 8 }}>
                <input type="number" value={birthYear} onChange={e => setBirthYear(e.target.value)} placeholder="1995" min="1940" max="2015" style={inputStyle} />
                <select value={birthMonth} onChange={e => setBirthMonth(e.target.value)} style={selectStyle}>
                  <option value="">월</option>
                  {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}월</option>)}
                </select>
                <select value={birthDay} onChange={e => setBirthDay(e.target.value)} style={selectStyle}>
                  <option value="">일</option>
                  {Array.from({ length: 31 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}일</option>)}
                </select>
                <select value={birthHour} onChange={e => setBirthHour(e.target.value)} style={selectStyle}>
                  {HOUR_OPTIONS.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
                </select>
              </div>
            </div>

            {/* 직업 */}
            <div>
              <label style={labelStyle}>직업</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {JOB_OPTIONS.map(j => (
                  <button key={j} onClick={() => setJob(j)} style={chipStyle(job === j)}>{j}</button>
                ))}
              </div>
              {job === "기타" && (
                <input value={jobCustom} onChange={e => setJobCustom(e.target.value)} placeholder="직업을 입력해주세요" style={{ ...inputStyle, marginTop: 8 }}
                  onFocus={e => e.target.style.borderColor = accent} onBlur={e => e.target.style.borderColor = border} />
              )}
            </div>

            {/* MBTI */}
            <div>
              <label style={labelStyle}>MBTI <span style={{ fontWeight: 400, color: muted }}>(선택)</span></label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {MBTI_LIST.map(m => (
                  <button key={m} onClick={() => setMbti(mbti === m ? "" : m)} style={{
                    ...chipStyle(mbti === m),
                    padding: "5px 10px", fontSize: 12, minWidth: 52, justifyContent: "center",
                  }}>{m}</button>
                ))}
              </div>
            </div>

            {/* 관심 SNS */}
            <div>
              <label style={labelStyle}>관심 있는 SNS <span style={{ fontWeight: 400, color: muted }}>(복수 선택)</span></label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {SNS_OPTIONS.map(s => (
                  <button key={s.id} onClick={() => toggleSns(s.id)} style={{
                    ...chipStyle(snsList.includes(s.id)),
                    padding: "8px 14px",
                  }}>
                    <img src={s.icon} alt="" style={{ width: 18, height: 18, borderRadius: 3, objectFit: "contain" }} onError={e => { e.target.style.display = "none"; }} />
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 추가 정보 */}
            <div>
              <label style={labelStyle}>추가 정보 <span style={{ fontWeight: 400, color: muted }}>(관심사, 목표 등)</span></label>
              <textarea value={extra} onChange={e => setExtra(e.target.value)}
                placeholder="예: 요리에 관심이 많고, 부업으로 수익화하고 싶어요"
                rows={3} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.7 }}
                onFocus={e => e.target.style.borderColor = accent} onBlur={e => e.target.style.borderColor = border} />
            </div>
          </div>

          {/* 시작 버튼 */}
          <button onClick={startConsulting} style={{
            width: "100%", padding: "16px", marginTop: 20, borderRadius: 14, border: "none",
            background: `linear-gradient(135deg, ${accent}, #8b5cf6)`, color: "#fff",
            fontSize: 16, fontWeight: 800, cursor: "pointer",
            boxShadow: "0 4px 20px rgba(124,106,255,0.3)",
            fontFamily: "inherit", transition: "transform 0.1s",
          }}
            onMouseDown={e => e.currentTarget.style.transform = "scale(0.98)"}
            onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}>
            AI 분석하기
          </button>
        </div>
      </div>
    );
  }

  // 마크다운 → HTML 변환 (테이블, 구분선, 헤더, bold)
  const formatContent = (raw) => {
    const lines = raw.split("\n");
    const out = [];
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      // 마크다운 테이블 감지
      if (line.includes("|") && i + 1 < lines.length && /^\s*\|[-:\s|]+\|\s*$/.test(lines[i + 1])) {
        const headers = line.split("|").filter(c => c.trim()).map(c => c.trim());
        i += 2; // 헤더 + 구분선 스킵
        const rows = [];
        while (i < lines.length && lines[i].includes("|") && lines[i].trim().startsWith("|")) {
          rows.push(lines[i].split("|").filter(c => c.trim()).map(c => c.trim()));
          i++;
        }
        const tblBdr = isDark ? "rgba(255,255,255,0.1)" : "#e5e5f0";
        const tblHdBg = isDark ? "rgba(124,106,255,0.12)" : "rgba(124,106,255,0.06)";
        let tbl = `<table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:13px;border-radius:12px;overflow:hidden;border:1px solid ${tblBdr}">`;
        tbl += "<thead><tr>";
        headers.forEach(h => { tbl += `<th style="padding:10px 14px;text-align:left;font-weight:700;background:${tblHdBg};border-bottom:1px solid ${tblBdr}">${boldify(h)}</th>`; });
        tbl += "</tr></thead><tbody>";
        rows.forEach((r, ri) => {
          const bg = ri % 2 === 1 ? (isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.015)") : "transparent";
          tbl += `<tr style="background:${bg}">`;
          r.forEach((c, ci) => {
            const fw = ci === 0 ? "font-weight:600;" : "";
            tbl += `<td style="padding:9px 14px;border-bottom:1px solid ${tblBdr};${fw}line-height:1.7">${boldify(c)}</td>`;
          });
          tbl += "</tr>";
        });
        tbl += "</tbody></table>";
        out.push(tbl);
        continue;
      }
      // 구분선
      if (/^---+$/.test(line.trim())) {
        out.push(`<hr style="border:none;border-top:1px solid ${isDark ? "rgba(255,255,255,0.08)" : "#e5e5f0"};margin:24px 0"/>`);
        i++; continue;
      }
      // ###, ## 헤더 → 마크다운 기호만 제거하고 일반 텍스트로 처리
      if (/^#{1,4}\s+/.test(line)) {
        const title = line.replace(/^#{1,4}\s+/, "");
        out.push(`<div style="font-size:15px;font-weight:700;margin:18px 0 8px;color:${text}">${boldify(title)}</div>`);
        i++; continue;
      }
      // 빈 줄
      if (!line.trim()) { out.push("<br/>"); i++; continue; }
      // 일반 텍스트 — bullet(-, *) 기호는 제거하고 문장만 표시
      let processed = line.replace(/^[-*]\s+/, "");
      processed = boldify(processed);
      out.push(processed + "<br/>");
      i++;
    }
    return out.join("");
  };

  const boldify = (s) => s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // 맨 위로 스크롤
  const handleChatScroll = () => {
    if (chatContainerRef.current) {
      setShowScrollTop(chatContainerRef.current.scrollTop > 300);
    }
  };
  const scrollToTop = () => {
    if (chatContainerRef.current) chatContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── 채팅 화면 (Gemini 스타일 중앙 정렬) ──
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: isDark ? "transparent" : "#f4f4f8" }}>
      {/* 채팅 영역 — 중앙 정렬 */}
      <div ref={chatContainerRef} onScroll={handleChatScroll} style={{ flex: 1, overflowY: "auto", position: "relative" }}>
        {/* 맨 위로 버튼 */}
        {showScrollTop && (
          <button onClick={scrollToTop} style={{
            position: "sticky", top: 12, left: "100%", marginRight: 16, zIndex: 10,
            width: 40, height: 40, borderRadius: 12, border: `1px solid ${border}`,
            background: isDark ? "rgba(30,25,60,0.9)" : "rgba(255,255,255,0.95)",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 2px 12px rgba(0,0,0,0.1)", transition: "opacity 0.2s",
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round"><polyline points="18 15 12 9 6 15"/></svg>
          </button>
        )}
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 24px 16px" }}>
          {/* 프로필 요약 카드 */}
          {messages.length > 0 && (
            <div style={{ margin: "0 auto 24px", padding: "16px 20px", borderRadius: 16, background: `${accent}06`, border: `1px solid ${accent}15`, fontSize: 12, color: muted, lineHeight: 1.8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: `${accent}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: accent }}>{name}님의 프로필</span>
                <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                  <button onClick={() => { setPhase("form"); setMessages([]); }}
                    style={{ padding: "3px 10px", borderRadius: 8, border: `1px solid ${border}`, background: "transparent", color: muted, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                    수정
                  </button>
                  <button onClick={() => { setPhase("form"); setMessages([]); setName(""); setBirthYear(""); setBirthMonth(""); setBirthDay(""); setBirthHour("unknown"); setGender(""); setJob(""); setJobCustom(""); setSnsList([]); setMbti(""); setExtra(""); setSaved(false); }}
                    style={{ padding: "3px 10px", borderRadius: 8, border: `1px solid ${accent}`, background: `${accent}10`, color: accent, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                    새로 입력하기
                  </button>
                </div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px" }}>
                {buildProfile().split("\n").map((line, j) => <span key={j}>{line}</span>)}
              </div>
            </div>
          )}

          {/* AI 응답들 (중앙 정렬, 말풍선 없이) */}
          {messages.map((msg, i) => {
            if (msg.role === "user" && msg.content.startsWith("[사용자 프로필]")) return null;
            const isUser = msg.role === "user";
            if (isUser) {
              return (
                <div key={i} style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
                  <div style={{
                    maxWidth: "80%", padding: "12px 18px", borderRadius: 20, borderBottomRightRadius: 6,
                    background: accent, color: "#fff", fontSize: 14, lineHeight: 1.7, wordBreak: "break-word",
                  }}>
                    {msg.content}
                  </div>
                </div>
              );
            }
            // AI 응답 — 스트리밍 중에는 plain text, 완료 후 포맷팅
            return (
              <div key={i} style={{ marginBottom: 28 }}>
                {msg.streaming ? (
                  <div style={{
                    fontSize: 15, lineHeight: 2, color: text, wordBreak: "break-word", whiteSpace: "pre-wrap",
                  }}>{msg.content}</div>
                ) : (
                  <div style={{
                    fontSize: 15, lineHeight: 2, color: text, wordBreak: "break-word",
                  }} dangerouslySetInnerHTML={{ __html: formatContent(msg.content) }} />
                )}
              </div>
            );
          })}

          {/* 로딩 인디케이터 */}
          {loading && messages.length > 0 && messages[messages.length - 1].role === "user" && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", gap: 6, padding: "8px 0" }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: accent, opacity: 0.4, animation: `blink 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                ))}
              </div>
            </div>
          )}

          {/* 액션바: 공유 / 인쇄 / 저장 완료 표시 */}
          {!loading && messages.length > 1 && messages[messages.length - 1].role === "assistant" && !messages[messages.length - 1].streaming && (
            <div style={{
              display: "flex", gap: 8, flexWrap: "wrap", padding: "16px 0 8px",
              borderTop: `1px solid ${border}`, marginTop: 8, alignItems: "center",
            }}>
              {/* SNS 공유 */}
              <div style={{ position: "relative" }}>
                <button onClick={() => setShareToast(shareToast === "open" ? "" : "open")} style={{
                  padding: "8px 16px", borderRadius: 10, border: `1px solid ${border}`,
                  background: "transparent", color: text, fontSize: 13, fontWeight: 600,
                  cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6,
                }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                  공유하기
                </button>
                {shareToast === "open" && (
                  <div style={{
                    position: "absolute", bottom: "calc(100% + 8px)", left: 0, zIndex: 100,
                    background: isDark ? "#1e1940" : "#fff", border: `1px solid ${border}`,
                    borderRadius: 14, padding: "12px 14px", minWidth: 220,
                    boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: text, marginBottom: 10 }}>SNS로 공유</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {[
                        { id: "kakao", label: "카카오톡", color: "#FEE500", tc: "#3C1E1E", url: (t, u) => `https://story.kakao.com/share?url=${u}` },
                        { id: "x", label: "X", color: "#000", tc: "#fff", url: (t, u) => `https://x.com/intent/tweet?text=${t}&url=${u}` },
                        { id: "facebook", label: "페이스북", color: "#1877F2", tc: "#fff", url: (t, u) => `https://www.facebook.com/sharer/sharer.php?u=${u}&quote=${t}` },
                        { id: "band", label: "밴드", color: "#06CF9C", tc: "#fff", url: (t, u) => `https://band.us/plugin/share?body=${t}%20${u}&route=${u}` },
                        { id: "line", label: "라인", color: "#06C755", tc: "#fff", url: (t, u) => `https://social-plugins.line.me/lineit/share?url=${u}&text=${t}` },
                        { id: "threads", label: "스레드", color: "#000", tc: "#fff", url: (t, u) => `https://www.threads.net/intent/post?text=${t}%20${u}` },
                      ].map(p => (
                        <button key={p.id} onClick={() => {
                          const shareTitle = encodeURIComponent(`${name}님의 SNS 길잡이 결과`);
                          const shareUrl = encodeURIComponent(window.location.href);
                          window.open(p.url(shareTitle, shareUrl), "_blank", "width=600,height=500");
                          setShareToast("");
                        }} style={{
                          padding: "6px 12px", borderRadius: 8, border: "none",
                          background: p.color, color: p.tc, fontSize: 11, fontWeight: 700,
                          cursor: "pointer", fontFamily: "inherit",
                        }}>{p.label}</button>
                      ))}
                      <button onClick={() => {
                        const lastAi = messages.filter(m => m.role === "assistant").pop();
                        if (lastAi) navigator.clipboard.writeText(`[${name}님의 SNS 길잡이 결과]\n\n${lastAi.content}`);
                        setShareToast("copied");
                        setTimeout(() => setShareToast(""), 2000);
                      }} style={{
                        padding: "6px 12px", borderRadius: 8, border: `1px solid ${border}`,
                        background: "transparent", color: muted, fontSize: 11, fontWeight: 700,
                        cursor: "pointer", fontFamily: "inherit",
                      }}>링크 복사</button>
                    </div>
                  </div>
                )}
                {shareToast === "copied" && (
                  <span style={{ position: "absolute", bottom: "calc(100% + 8px)", left: 0, padding: "6px 12px", borderRadius: 8, background: accent, color: "#fff", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>복사 완료</span>
                )}
              </div>

              {/* 인쇄 / PDF */}
              <button onClick={() => {
                const lastAi = messages.filter(m => m.role === "assistant").pop();
                if (!lastAi) return;
                const printWin = window.open("", "_blank", "width=800,height=600");
                const profileText = buildProfile().replace(/\n/g, "<br/>");
                printWin.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${name}님의 SNS 길잡이</title>
                  <style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:700px;margin:40px auto;padding:0 20px;color:#1a1a2e;line-height:2;font-size:15px}
                  table{width:100%;border-collapse:collapse;margin:16px 0;font-size:13px}th,td{padding:10px 14px;text-align:left;border-bottom:1px solid #e5e5f0}
                  th{font-weight:700;background:#f8f8fc}hr{border:none;border-top:1px solid #e5e5f0;margin:24px 0}
                  .profile{padding:16px 20px;border-radius:12px;background:#f8f8fc;margin-bottom:24px;font-size:13px;line-height:1.8}
                  h1{font-size:22px;margin-bottom:8px}@media print{body{margin:20px auto}}</style></head>
                  <body><h1>${name}님의 SNS 길잡이</h1><div class="profile">${profileText}</div>${formatContent(lastAi.content)}</body></html>`);
                printWin.document.close();
                setTimeout(() => printWin.print(), 300);
              }} style={{
                padding: "8px 16px", borderRadius: 10, border: `1px solid ${border}`,
                background: "transparent", color: text, fontSize: 13, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6,
              }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                인쇄 / PDF
              </button>

              {/* 보관함 저장 표시 */}
              {saved && (
                <span style={{ padding: "8px 12px", fontSize: 12, color: "#10b981", fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                  보관함에 저장됨
                </span>
              )}

              {/* 토스트는 공유 팝업 내부에서 처리 */}
            </div>
          )}

          <div ref={chatEndRef} />
        </div>
      </div>

      {/* 하단 입력 바 — 중앙 정렬 */}
      <div style={{ flexShrink: 0, padding: "0 24px 16px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{
            display: "flex", gap: 8, alignItems: "flex-end",
            padding: "10px 16px", borderRadius: 20, border: `1.5px solid ${border}`,
            background: inputBg, transition: "border-color 0.15s",
          }}
            onFocus={() => {}} /* parent focus handling via textarea */
          >
            <textarea value={chatInput} onChange={e => setChatInput(e.target.value)}
              placeholder="추가 질문을 입력하세요"
              rows={1}
              style={{
                flex: 1, padding: "4px 0", border: "none", background: "transparent",
                color: text, fontSize: 14, outline: "none", fontFamily: "inherit",
                resize: "none", lineHeight: 1.5, maxHeight: 120, overflow: "auto",
              }}
              onInput={e => { e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"; }}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
            />
            <button onClick={sendChat} disabled={loading || !chatInput.trim()}
              style={{
                width: 36, height: 36, borderRadius: 10, border: "none", flexShrink: 0,
                background: loading || !chatInput.trim() ? (isDark ? "rgba(255,255,255,0.08)" : "#e5e5e5") : accent,
                color: "#fff", cursor: loading ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10, justifyContent: "center" }}>
            {["올해 운세랑 연결해서 콘텐츠 방향 알려줘", "일주일 포스팅 계획 짜줘", "나한테 맞는 수익화 방법은?", "내 성향에 맞는 톤앤매너 추천해줘"].map(q => (
              <button key={q} onClick={() => { setChatInput(q); }}
                style={{ padding: "6px 14px", borderRadius: 20, border: `1px solid ${border}`, background: "transparent", color: muted, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = accent; e.currentTarget.style.color = accent; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = border; e.currentTarget.style.color = muted; }}>
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
