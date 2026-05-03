import { useState, useEffect } from "react";
import { isDarkTheme } from "./theme";
import { callAI } from "./aiClient";
import { useI18n } from "./i18n.jsx";

/* ════════════════════════════════════════════════════════════
   AutoPublisher — 네이버 블로그/카페 자동발행 (관리자 전용)
════════════════════════════════════════════════════════════ */

const PLATFORMS = [
  { id: "naver_blog", label: "네이버 블로그", icon: "/icon-naver-blog.png", desc: "블로그에 자동으로 글을 발행합니다" },
  { id: "naver_cafe", label: "네이버 카페", icon: "/icon-naver-cafe.webp", desc: "카페에 자동으로 글을 발행합니다" },
];

const SCHEDULE_OPTIONS = [
  { id: "daily", label: "매일" },
  { id: "weekday", label: "평일만 (월~금)" },
  { id: "weekly", label: "주 1회" },
  { id: "custom", label: "직접 설정" },
];

const DAYS = ["월", "화", "수", "목", "금", "토", "일"];

const CATEGORIES = [
  { id: "marketing", label: "온라인마케팅" },
  { id: "instagram", label: "인스타그램" },
  { id: "youtube", label: "유튜브" },
  { id: "blog_cafe", label: "블로그/카페" },
  { id: "video_edit", label: "영상편집" },
  { id: "custom", label: "직접 입력" },
];

const STORAGE_KEY = "auto_publish_configs";

function loadConfigs() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}
function saveConfigs(configs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
}

export default function AutoPublisher({ theme, user, onLoginRequest, embedded }) {
  const { t } = useI18n();
  const isDark = isDarkTheme(theme);
  const isAdmin = user?.role === "admin";

  // 설정 목록
  const [configs, setConfigs] = useState(loadConfigs);
  const [editMode, setEditMode] = useState(null); // null | "new" | configId
  const [testStatus, setTestStatus] = useState({}); // { configId: "testing"|"success"|"error" }
  const [testLog, setTestLog] = useState({});

  // 폼 상태
  const [form, setForm] = useState({
    platform: "naver_blog",
    naverId: "",
    naverPw: "",
    blogId: "",
    cafeId: "",
    cafeMenuId: "",
    schedule: "daily",
    customDays: [],
    postTime: "09:00",
    postsPerDay: 3,
    categories: [],
    customCategory: "",
    tone: "professional",
    wordCount: 2000,
    enabled: true,
  });

  useEffect(() => { saveConfigs(configs); }, [configs]);

  // 관리자 아닌 경우
  if (!isAdmin) {
    return (
      <div style={{ textAlign: "center", padding: "80px 20px" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: isDark ? "#fff" : "#1a1a2e", marginBottom: 8 }}>{t("ap_admin_only")}</div>
        <div style={{ fontSize: 14, color: isDark ? "rgba(255,255,255,0.5)" : "#888" }}>{t("ap_admin_only_desc")}</div>
      </div>
    );
  }

  const accent = "#168EEA";
  const cardBg = isDark ? "rgba(255,255,255,0.04)" : "#fff";
  const cardBdr = isDark ? "rgba(255,255,255,0.1)" : "#e5e7eb";
  const textMain = isDark ? "#fff" : "#1a1a2e";
  const textSub = isDark ? "rgba(255,255,255,0.5)" : "#888";
  const inputBg = isDark ? "rgba(255,255,255,0.06)" : "#f8f9fb";
  const inputBdr = isDark ? "rgba(255,255,255,0.12)" : "#ddd";

  const inputStyle = {
    width: "100%", padding: "10px 14px", borderRadius: 10,
    border: `1.5px solid ${inputBdr}`, background: inputBg,
    color: textMain, fontSize: 14, outline: "none", boxSizing: "border-box",
  };
  const labelStyle = { fontSize: 13, fontWeight: 700, color: textMain, marginBottom: 6, display: "block" };
  const sectionStyle = { marginBottom: 20 };

  const resetForm = () => setForm({
    platform: "naver_blog", naverId: "", naverPw: "", blogId: "", cafeId: "", cafeMenuId: "",
    schedule: "daily", customDays: [], postTime: "09:00", postsPerDay: 3,
    categories: [], customCategory: "", tone: "professional", wordCount: 2000, enabled: true,
  });

  const handleSave = () => {
    if (!form.naverId || !form.naverPw) return alert("네이버 아이디와 비밀번호를 입력하세요.");
    if (form.platform === "naver_blog" && !form.blogId) return alert("블로그 ID를 입력하세요.");
    if (form.platform === "naver_cafe" && (!form.cafeId || !form.cafeMenuId)) return alert("카페 ID와 게시판 번호를 입력하세요.");
    if (form.categories.length === 0 && !form.customCategory) return alert("카테고리를 최소 1개 선택하세요.");

    const config = {
      ...form,
      id: editMode === "new" ? Date.now().toString() : editMode,
      updatedAt: new Date().toISOString(),
    };

    if (editMode === "new") {
      setConfigs(prev => [...prev, config]);
    } else {
      setConfigs(prev => prev.map(c => c.id === editMode ? config : c));
    }
    setEditMode(null);
    resetForm();
  };

  const handleDelete = (id) => {
    if (!confirm("이 자동발행 설정을 삭제할까요?")) return;
    setConfigs(prev => prev.filter(c => c.id !== id));
  };

  const handleEdit = (config) => {
    setForm({ ...config });
    setEditMode(config.id);
  };

  const handleToggle = (id) => {
    setConfigs(prev => prev.map(c => c.id === id ? { ...c, enabled: !c.enabled } : c));
  };

  const handleTest = async (config) => {
    setTestStatus(prev => ({ ...prev, [config.id]: "testing" }));
    setTestLog(prev => ({ ...prev, [config.id]: "테스트 발행 시작...\n" }));

    try {
      // 1단계: AI로 글 생성
      const addLog = (msg) => setTestLog(prev => ({ ...prev, [config.id]: (prev[config.id] || "") + msg + "\n" }));
      addLog("1. AI로 글 생성 중...");

      const cats = (config.categories || []).length > 0 ? config.categories : [config.customCategory || "온라인마케팅"];
      const category = cats[Math.floor(Math.random() * cats.length)];
      const catLabel = CATEGORIES.find(c => c.id === category)?.label || config.customCategory || category;

      const prompt = `네이버 ${config.platform === "naver_blog" ? "블로그" : "카페"}에 올릴 글을 작성해주세요.
카테고리: ${catLabel}
분량: ${config.wordCount}자 내외
문체: ${config.tone === "professional" ? "전문적이고 신뢰감 있는" : config.tone === "friendly" ? "친근하고 대화하듯" : "정보 전달 위주"}

글 구조:
- 제목 (검색 키워드 3개 조합, 40자 이내)
- 도입부 (2-3문장)
- 소제목 5개 + 각 소제목별 본문
- 마무리

JSON 형식으로 응답:
{"title":"제목","intro":"도입부","sections":[{"subtitle":"소제목","content":"본문"}],"conclusion":"마무리","tags":["태그1","태그2","태그3","태그4","태그5"]}`;

      const aiResult = await callAI("claude-haiku-4-5", [{ role: "user", content: prompt }], 4000);
      addLog("   글 생성 완료!");

      // 2단계: 자동발행 서버로 전송
      addLog("2. 자동발행 서버에 발행 요청 중...");

      let postData;
      try {
        const jsonMatch = aiResult.match(/\{[\s\S]*\}/);
        postData = JSON.parse(jsonMatch[0]);
        // 배열 필드 방어 처리
        if (!Array.isArray(postData.sections)) postData.sections = [];
        if (!Array.isArray(postData.tags)) postData.tags = [];
      } catch {
        addLog("   AI 응답 파싱 실패 - 글 생성은 성공했으나 형식 오류");
        setTestStatus(prev => ({ ...prev, [config.id]: "error" }));
        return;
      }

      const res = await fetch("/api/auto-publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test-publish",
          platform: config.platform,
          naverId: config.naverId,
          naverPw: config.naverPw,
          blogId: config.blogId,
          cafeId: config.cafeId,
          cafeMenuId: config.cafeMenuId,
          post: postData,
        }),
      });

      const result = await res.json();
      if (result.success) {
        addLog("   발행 성공! URL: " + (result.postUrl || "확인 필요"));
        setTestStatus(prev => ({ ...prev, [config.id]: "success" }));
      } else {
        addLog("   발행 실패: " + (result.error || "알 수 없는 오류"));
        addLog("   (자동발행 서버가 아직 연결되지 않았을 수 있습니다)");
        setTestStatus(prev => ({ ...prev, [config.id]: "error" }));
      }
    } catch (err) {
      setTestLog(prev => ({ ...prev, [config.id]: (prev[config.id] || "") + "오류: " + err.message + "\n(자동발행 서버 연결을 확인하세요)\n" }));
      setTestStatus(prev => ({ ...prev, [config.id]: "error" }));
    }
  };

  // ── 설정 편집 폼 ──
  if (editMode) {
    const formContent = (
      <div style={{ maxWidth: 640, margin: "0 auto", padding: embedded ? "0" : "32px 24px 60px" }}>
            {/* 헤더 */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
              <button onClick={() => { setEditMode(null); resetForm(); }}
                style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${cardBdr}`, background: "transparent", color: textSub, fontSize: 13, cursor: "pointer" }}>
                ← 뒤로
              </button>
              <div style={{ fontSize: 20, fontWeight: 900, color: textMain }}>
                {editMode === "new" ? "새 자동발행 설정" : "설정 수정"}
              </div>
            </div>

            {/* 플랫폼 선택 */}
            <div style={sectionStyle}>
              <label style={labelStyle}>발행 플랫폼</label>
              <div style={{ display: "flex", gap: 10 }}>
                {PLATFORMS.map(p => (
                  <button key={p.id} onClick={() => setForm(f => ({ ...f, platform: p.id }))}
                    style={{
                      flex: 1, padding: "16px 12px", borderRadius: 12,
                      border: `2px solid ${form.platform === p.id ? accent : cardBdr}`,
                      background: form.platform === p.id ? (isDark ? "rgba(0,0,0,0.06)" : "rgba(0,0,0,0.06)") : cardBg,
                      cursor: "pointer", textAlign: "center",
                    }}>
                    <img src={p.icon} alt="" style={{ width: 28, height: 28, objectFit: "contain", marginBottom: 6 }} />
                    <div style={{ fontSize: 13, fontWeight: 700, color: form.platform === p.id ? accent : textMain }}>{p.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 네이버 계정 */}
            <div style={{ ...sectionStyle, padding: 20, borderRadius: 14, border: `1.5px solid ${cardBdr}`, background: cardBg }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: textMain, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16 }}>🔐</span> 네이버 계정 정보
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>아이디</label>
                  <input type="text" value={form.naverId} onChange={e => setForm(f => ({ ...f, naverId: e.target.value }))}
                    placeholder="네이버 아이디" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>비밀번호</label>
                  <input type="password" value={form.naverPw} onChange={e => setForm(f => ({ ...f, naverPw: e.target.value }))}
                    placeholder="비밀번호" style={inputStyle} />
                </div>
              </div>
              {form.platform === "naver_blog" && (
                <div style={{ marginTop: 12 }}>
                  <label style={labelStyle}>블로그 ID</label>
                  <input type="text" value={form.blogId} onChange={e => setForm(f => ({ ...f, blogId: e.target.value }))}
                    placeholder="blog.naver.com/여기부분" style={inputStyle} />
                </div>
              )}
              {form.platform === "naver_cafe" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
                  <div>
                    <label style={labelStyle}>카페 ID (숫자)</label>
                    <input type="text" value={form.cafeId} onChange={e => setForm(f => ({ ...f, cafeId: e.target.value }))}
                      placeholder="카페 클럽 ID" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>게시판 메뉴 ID</label>
                    <input type="text" value={form.cafeMenuId} onChange={e => setForm(f => ({ ...f, cafeMenuId: e.target.value }))}
                      placeholder="게시판 번호" style={inputStyle} />
                  </div>
                </div>
              )}
              <div style={{ fontSize: 11, color: textSub, marginTop: 10, padding: "8px 12px", borderRadius: 8, background: isDark ? "rgba(255,255,255,0.03)" : "#f0f0f0" }}>
                계정 정보는 브라우저 로컬에만 저장되며 서버로 전송되지 않습니다. 발행 시에만 암호화되어 자동발행 서버로 전달됩니다.
              </div>
            </div>

            {/* 스케줄 설정 */}
            <div style={{ ...sectionStyle, padding: 20, borderRadius: 14, border: `1.5px solid ${cardBdr}`, background: cardBg }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: textMain, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16 }}>📅</span> 스케줄 설정
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>반복 주기</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {SCHEDULE_OPTIONS.map(s => (
                    <button key={s.id} onClick={() => setForm(f => ({ ...f, schedule: s.id }))}
                      style={{
                        padding: "8px 16px", borderRadius: 20,
                        border: `1.5px solid ${form.schedule === s.id ? accent : cardBdr}`,
                        background: form.schedule === s.id ? (isDark ? "rgba(0,0,0,0.06)" : "rgba(0,0,0,0.06)") : "transparent",
                        color: form.schedule === s.id ? accent : textSub,
                        fontSize: 13, fontWeight: 600, cursor: "pointer",
                      }}>{s.label}</button>
                  ))}
                </div>
              </div>
              {form.schedule === "custom" && (
                <div style={{ marginBottom: 12 }}>
                  <label style={labelStyle}>요일 선택</label>
                  <div style={{ display: "flex", gap: 6 }}>
                    {DAYS.map((d, i) => (
                      <button key={d} onClick={() => {
                        setForm(f => ({
                          ...f,
                          customDays: f.customDays.includes(i) ? f.customDays.filter(x => x !== i) : [...f.customDays, i]
                        }));
                      }}
                        style={{
                          width: 40, height: 40, borderRadius: "50%",
                          border: `2px solid ${form.customDays.includes(i) ? accent : cardBdr}`,
                          background: form.customDays.includes(i) ? accent : "transparent",
                          color: form.customDays.includes(i) ? "#fff" : textSub,
                          fontSize: 13, fontWeight: 700, cursor: "pointer",
                        }}>{d}</button>
                    ))}
                  </div>
                </div>
              )}
              {form.schedule === "weekly" && (
                <div style={{ marginBottom: 12 }}>
                  <label style={labelStyle}>발행 요일</label>
                  <div style={{ display: "flex", gap: 6 }}>
                    {DAYS.map((d, i) => (
                      <button key={d} onClick={() => setForm(f => ({ ...f, customDays: [i] }))}
                        style={{
                          width: 40, height: 40, borderRadius: "50%",
                          border: `2px solid ${form.customDays.includes(i) ? accent : cardBdr}`,
                          background: form.customDays.includes(i) ? accent : "transparent",
                          color: form.customDays.includes(i) ? "#fff" : textSub,
                          fontSize: 13, fontWeight: 700, cursor: "pointer",
                        }}>{d}</button>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>발행 시작 시간</label>
                  <input type="time" value={form.postTime} onChange={e => setForm(f => ({ ...f, postTime: e.target.value }))}
                    style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>하루 발행 수</label>
                  <select value={form.postsPerDay} onChange={e => setForm(f => ({ ...f, postsPerDay: parseInt(e.target.value) }))}
                    style={inputStyle}>
                    {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}개</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* 콘텐츠 설정 */}
            <div style={{ ...sectionStyle, padding: 20, borderRadius: 14, border: `1.5px solid ${cardBdr}`, background: cardBg }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: textMain, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16 }}>✍️</span> 콘텐츠 설정
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>글 카테고리 (복수 선택 가능)</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {CATEGORIES.filter(c => c.id !== "custom").map(c => (
                    <button key={c.id} onClick={() => {
                      setForm(f => ({
                        ...f,
                        categories: f.categories.includes(c.id) ? f.categories.filter(x => x !== c.id) : [...f.categories, c.id]
                      }));
                    }}
                      style={{
                        padding: "8px 14px", borderRadius: 20,
                        border: `1.5px solid ${form.categories.includes(c.id) ? accent : cardBdr}`,
                        background: form.categories.includes(c.id) ? (isDark ? "rgba(0,0,0,0.06)" : "rgba(0,0,0,0.06)") : "transparent",
                        color: form.categories.includes(c.id) ? accent : textSub,
                        fontSize: 12, fontWeight: 600, cursor: "pointer",
                      }}>{c.label}</button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>또는 직접 입력</label>
                <input type="text" value={form.customCategory} onChange={e => setForm(f => ({ ...f, customCategory: e.target.value }))}
                  placeholder="예: 부동산, 건강, 요리 등" style={inputStyle} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>글 문체</label>
                  <select value={form.tone} onChange={e => setForm(f => ({ ...f, tone: e.target.value }))} style={inputStyle}>
                    <option value="professional">전문적/신뢰감</option>
                    <option value="friendly">친근한/대화체</option>
                    <option value="informative">정보 전달</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>목표 분량 (자)</label>
                  <select value={form.wordCount} onChange={e => setForm(f => ({ ...f, wordCount: parseInt(e.target.value) }))} style={inputStyle}>
                    <option value={1000}>1,000자</option>
                    <option value={1500}>1,500자</option>
                    <option value={2000}>2,000자</option>
                    <option value={2500}>2,500자</option>
                    <option value={3000}>3,000자</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 저장 버튼 */}
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button onClick={() => { setEditMode(null); resetForm(); }}
                style={{ flex: 1, padding: "14px 0", borderRadius: 12, border: `1.5px solid ${cardBdr}`, background: "transparent", color: textSub, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
                취소
              </button>
              <button onClick={handleSave}
                style={{ flex: 2, padding: "14px 0", borderRadius: 12, border: "none", background: accent, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
                {editMode === "new" ? "설정 저장" : "수정 저장"}
              </button>
            </div>
          </div>
    );
    if (embedded) return formContent;
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ flex: 1, overflowY: "auto", background: isDark ? "transparent" : "#f8f9fb" }}>
          {formContent}
        </div>
      </div>
    );
  }

  // ── 설정 목록 ──
  const scheduleLabel = (c) => {
    if (c.schedule === "daily") return "매일";
    if (c.schedule === "weekday") return "평일";
    if (c.schedule === "weekly") return `매주 ${DAYS[c.customDays?.[0]] || "월"}`;
    if (c.schedule === "custom") return c.customDays?.map(d => DAYS[d]).join(", ") || "미설정";
    return c.schedule;
  };

  const listContent = (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: embedded ? "0" : "32px 24px 60px" }}>
          {/* 헤더 (embedded가 아닐 때만) */}
          {!embedded && (<div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: textMain, marginBottom: 6 }}>자동발행</div>
            <div style={{ fontSize: 13, color: textSub }}>AI가 글을 작성하고 네이버에 자동으로 발행합니다</div>
            <div style={{ display: "inline-block", marginTop: 8, padding: "4px 12px", borderRadius: 20, background: "rgba(251,191,36,0.15)", color: "#f59e0b", fontSize: 11, fontWeight: 700 }}>
              관리자 전용 (테스트 중)
            </div>
          </div>)}

          {/* 새 설정 추가 버튼 */}
          <button onClick={() => { resetForm(); setEditMode("new"); }}
            style={{
              width: "100%", padding: "18px", borderRadius: 14,
              border: `2px dashed ${cardBdr}`, background: "transparent",
              color: accent, fontSize: 14, fontWeight: 700, cursor: "pointer",
              marginBottom: 20, transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = accent; e.currentTarget.style.background = isDark ? "rgba(0,0,0,0.06)" : "rgba(0,0,0,0.06)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = cardBdr; e.currentTarget.style.background = "transparent"; }}>
            + 새 자동발행 설정 추가
          </button>

          {/* 설정 카드 목록 */}
          {configs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: textSub }}>
              <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.4 }}>📝</div>
              <div style={{ fontSize: 14 }}>아직 설정이 없습니다. 위 버튼을 눌러 자동발행을 설정하세요.</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {configs.map(config => {
                const platInfo = PLATFORMS.find(p => p.id === config.platform);
                const status = testStatus[config.id];
                return (
                  <div key={config.id} style={{
                    padding: 20, borderRadius: 14,
                    border: `1.5px solid ${config.enabled ? (isDark ? "rgba(0,0,0,0.06)" : "rgba(0,0,0,0.06)") : cardBdr}`,
                    background: cardBg,
                  }}>
                    {/* 상단 */}
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                      <img src={platInfo?.icon} alt="" style={{ width: 28, height: 28, objectFit: "contain" }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 15, fontWeight: 800, color: textMain }}>{platInfo?.label}</div>
                        <div style={{ fontSize: 12, color: textSub }}>{config.naverId} · {scheduleLabel(config)} {config.postTime} · {config.postsPerDay}개/일</div>
                      </div>
                      {/* 토글 */}
                      <button onClick={() => handleToggle(config.id)}
                        style={{
                          width: 48, height: 26, borderRadius: 13, border: "none", cursor: "pointer",
                          background: config.enabled ? "#10b981" : (isDark ? "rgba(255,255,255,0.15)" : "#ccc"),
                          position: "relative", transition: "background 0.2s",
                        }}>
                        <div style={{
                          width: 20, height: 20, borderRadius: "50%", background: "#fff",
                          position: "absolute", top: 3,
                          left: config.enabled ? 25 : 3,
                          transition: "left 0.2s",
                        }} />
                      </button>
                    </div>

                    {/* 카테고리 태그 */}
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
                      {config.categories?.map(cid => {
                        const cat = CATEGORIES.find(c => c.id === cid);
                        return cat ? (
                          <span key={cid} style={{ padding: "3px 10px", borderRadius: 12, background: isDark ? "rgba(0,0,0,0.06)" : "rgba(0,0,0,0.06)", color: accent, fontSize: 11, fontWeight: 600 }}>
                            {cat.label}
                          </span>
                        ) : null;
                      })}
                      {config.customCategory && (
                        <span style={{ padding: "3px 10px", borderRadius: 12, background: isDark ? "rgba(16,185,129,0.12)" : "rgba(16,185,129,0.08)", color: "#10b981", fontSize: 11, fontWeight: 600 }}>
                          {config.customCategory}
                        </span>
                      )}
                    </div>

                    {/* 액션 버튼 */}
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => handleTest(config)}
                        disabled={status === "testing"}
                        style={{
                          padding: "8px 16px", borderRadius: 8, border: "none", cursor: status === "testing" ? "wait" : "pointer",
                          background: status === "success" ? "rgba(16,185,129,0.15)" : status === "error" ? "rgba(239,68,68,0.15)" : "rgba(0,0,0,0.06)",
                          color: status === "success" ? "#10b981" : status === "error" ? "#ef4444" : accent,
                          fontSize: 12, fontWeight: 700,
                        }}>
                        {status === "testing" ? "테스트 중..." : status === "success" ? "성공" : status === "error" ? "실패 (재시도)" : "테스트 발행"}
                      </button>
                      <button onClick={() => handleEdit(config)}
                        style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${cardBdr}`, background: "transparent", color: textSub, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                        수정
                      </button>
                      <button onClick={() => handleDelete(config.id)}
                        style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "rgba(239,68,68,0.08)", color: "#ef4444", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                        삭제
                      </button>
                    </div>

                    {/* 테스트 로그 */}
                    {testLog[config.id] && (
                      <div style={{
                        marginTop: 12, padding: 12, borderRadius: 8,
                        background: isDark ? "rgba(0,0,0,0.3)" : "#f1f5f9",
                        fontSize: 11, fontFamily: "monospace", color: textSub,
                        whiteSpace: "pre-wrap", maxHeight: 150, overflowY: "auto",
                      }}>
                        {testLog[config.id]}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* 안내 */}
          <div style={{
            marginTop: 28, padding: 16, borderRadius: 12,
            background: isDark ? "rgba(251,191,36,0.06)" : "rgba(251,191,36,0.06)",
            border: `1px solid ${isDark ? "rgba(251,191,36,0.15)" : "rgba(251,191,36,0.2)"}`,
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#f59e0b", marginBottom: 6 }}>참고사항</div>
            <ul style={{ fontSize: 12, color: textSub, margin: 0, paddingLeft: 16, lineHeight: 1.8 }}>
              <li>자동발행은 별도 서버(Render)를 통해 실행됩니다</li>
              <li>네이버 계정 정보는 발행 시에만 암호화 전송되며 서버에 저장되지 않습니다</li>
              <li>하루 최대 발행 수는 네이버 정책에 따라 3~5개를 권장합니다</li>
              <li>발행 간격은 자동으로 1~3시간 랜덤 설정됩니다</li>
            </ul>
          </div>
        </div>
  );

  if (embedded) return listContent;
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ flex: 1, overflowY: "auto", background: isDark ? "transparent" : "#f8f9fb" }}>
        {listContent}
      </div>
    </div>
  );
}
