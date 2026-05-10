import React, { useState, useEffect } from "react";
import { getAuthToken, supabase } from "./storage";

const BRAND = "#3b82f6";

const CATEGORIES = [
  { id: "all", label: "전체" },
  { id: "update", label: "업데이트" },
  { id: "notice", label: "공지" },
  { id: "event", label: "이벤트" },
];

const CAT_COLORS = {
  update: { bg: "#dbeafe", color: "#3b82f6", label: "업데이트" },
  notice: { bg: "#fef3c7", color: "#d97706", label: "공지" },
  event: { bg: "#dcfce7", color: "#16a34a", label: "이벤트" },
};

// 초기 업데이트 로그 데이터
const INITIAL_NOTICES = [
  {
    title: "v0.1.9 — 대규모 업데이트 + 통합 횟수제 도입",
    body: "[프로그램 업데이트]\n- 새 버전 출시 시 모달 팝업으로 업데이트 안내\n- 설치 시 기존 버전 자동 감지/제거 후 설치\n- 커뮤니티 게시판: 홈페이지와 동일한 카테고리/태그 동적 로드\n- 커뮤니티 조회수 홈페이지 동기화\n- 커뮤니티 태그별 필터링 + 게시글 수 표시\n- 프로필 아바타 선택 (DiceBear 100종)\n- 뱃지 시스템 (관리자 지급 + 달성 뱃지)\n- 챌린지/부트캠프 게시판 연동\n- ffmpeg 분석 오류 수정\n\n[요금제 변경]\n- 글쓰기 + 디자인(카드뉴스/상세페이지) 통합 횟수제로 전환\n- Basic: 30회/월, Pro: 200회/월, Business: 700회/월\n- Pro부터 영상 생성 제한 없음\n- 네이버봇 일일 한도 → 월간 한도 전환 (매월 1일 리셋)\n- 모든 AI 생성 기능이 동일한 풀에서 1회씩 차감\n\n[홈페이지]\n- 부트캠프 시스템 전면 개편 (비회원 신청, 모임/스터디 유형)\n- 관리자 멤버십 관리, 뱃지 시스템, 아바타 선택\n- SNS 계정 링크 다중 입력 (최대 5개)\n- 보안 패치 (DOMPurify XSS 방지, RLS 정책 강화)",
    category: "update",
    pinned: true,
    created_at: "2026-05-06T11:00:00Z",
  },
  {
    title: "요금제 통합 안내 — AI 생성 횟수제로 전환",
    body: "기존 AI 글쓰기와 디자인(카드뉴스, 상세페이지) 횟수가 하나로 통합되었습니다.\n\n변경 내용:\n- Basic: 30회/월\n- Pro: 200회/월 + 영상 제한 없음\n- Business: 700회/월 + 영상 제한 없음\n\n글쓰기 1회 = 카드뉴스 1회 = 상세페이지 1회로 동일하게 차감됩니다.\n사용자가 글/디자인 비율을 자유롭게 조절할 수 있습니다.\n\n기존 구독자의 이번 달 남은 횟수는 유지됩니다.",
    category: "notice",
    pinned: false,
    created_at: "2026-05-06T10:30:00Z",
  },
  {
    title: "v0.1.8 — 빠른 시작 + 홈 대시보드 + 25건 업데이트",
    body: "- 빠른 시작 모드 (테마+카테고리만 입력, 1개 바로 발행)\n- 홈 대시보드 (발행 통계 + 최근 글 + 운영 상태)\n- 진행 프로그레스바 (5단계 시각화)\n- 키워드 포인트 글색 + 강조 방식 선택\n- 다중 테마 순환 발행\n- 발행 시간 분산 (아침/점심/저녁)\n- 발행 실패 자동 재시도\n- 데스크톱 알림 (성공/실패)\n- 네이버 계정 선택 발행\n- 글 제목 직접 입력 옵션\n- 카테고리 선택 Playwright 네이티브 안정화\n- 14건 버그 수정",
    category: "update",
    created_at: "2026-04-28T12:00:00Z",
  },
  {
    title: "v0.1.5 — 발행 패널 카테고리/태그 수정",
    body: "- 카테고리 선택: 발행 패널에서만 처리하도록 수정\n- 태그 입력: 발행 패널 열린 후에 태그 입력하도록 변경\n- 기존 에디터 영역에서 카테고리/태그 찾기 실패 에러 해결",
    category: "update",
    created_at: "2026-04-25T12:00:00Z",
  },
  {
    title: "v0.1.4 — 소제목 색상, 인용구, 스티커, 짤 이미지, SEO 강화",
    body: "- 소제목 번호(01,02,03) + 강조 색상 적용 (발행 후 유지)\n- 인용구 스타일 선택 정상 작동 (버티컬/라인&따옴표 등)\n- 짤/GIF 이미지 삽입 토글 추가\n- 스티커 삽입 안정화\n- 네이버 SEO(C-Rank/D.I.A) + AEO 프롬프트 강화\n- 볼드 잔류 문제 해결 (인라인 볼드 제거)\n- 이전 설정 자동 복원 (테마/카테고리/스타일)\n- extra 2000자 초과 에러 해결",
    category: "update",
    created_at: "2026-04-24T10:00:00Z",
  },
  {
    title: "v0.1.2 — 네이버 블로그/카페 자동 발행 안정화",
    body: "- 네이버 블로그 자동 발행 안정화\n- 네이버 카페 자동 글 등록 지원\n- 로그인 세션 저장 개선",
    category: "update",
    created_at: "2026-04-17T07:00:00Z",
  },
  {
    title: "v0.1.1 — 로그인 통합, 시스템 브라우저 감지",
    body: "- 로그인 버튼 통합 (계정 저장 + 세션 로그인 한 번에)\n- 로그인 안 될 때 가이드 추가 (캡차/2차인증/새기기 허용)\n- 시스템 Chrome/Edge 자동 감지 (Playwright 번들 없이 동작)\n- 제목 입력 실패 버그 수정 (JS 폴백 추가)\n- 버전 체크 추가 (구버전 자동 차단)\n- API: Anthropic 직접 호출로 전환",
    category: "update",
    created_at: "2026-04-13T14:00:00Z",
  },
  {
    title: "v0.1.0 — 메이킷 SNS 자동화 첫 출시",
    body: "- AI 기반 네이버 블로그 글 자동 생성\n- 네이버 SEO(C-Rank/D.I.A) 최적화 프롬프트\n- 네이버 계정 로그인 + 세션 저장\n- 테마 기반 자동 글 발행\n- Windows / Mac 지원",
    category: "update",
    created_at: "2026-04-13T08:00:00Z",
  },
  {
    title: "SNS메이킷 자료실 오픈",
    body: "SNS 운영에 필요한 프로그램, 템플릿, 무료 사진/영상을 한 곳에서 다운로드하세요.",
    category: "notice",
    created_at: "2026-04-15T03:00:00Z",
  },
];

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export default function NoticePage({ C, user, navigate }) {
  const [notices, setNotices] = useState(INITIAL_NOTICES);
  const [category, setCategory] = useState("all");
  const [selectedNotice, setSelectedNotice] = useState(null);
  const [showWrite, setShowWrite] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", category: "notice", pinned: false });
  const [saving, setSaving] = useState(false);
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    loadNotices();
  }, []);

  const loadNotices = async () => {
    try {
      const { data, error } = await supabase
        .from("notices")
        .select("*")
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) {
        // 테이블이 없으면 초기 데이터 표시
        console.log("notices table not found, using initial data");
        return;
      }
      if (data && data.length > 0) {
        setNotices(data);
      }
    } catch (e) {
      console.log("Failed to load notices:", e);
    }
  };

  const adminNoticeApi = async (subAction, payload = {}) => {
    const token = await getAuthToken();
    const res = await fetch(`/api/sns?action=admin&sub_action=${subAction}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "관리자 API 요청 실패");
    return data;
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.body.trim()) return alert("제목과 내용을 입력하세요.");
    setSaving(true);
    try {
      await adminNoticeApi("notice_create", {
        title: form.title,
        body: form.body,
        category: form.category,
        pinned: form.pinned,
      });
      setForm({ title: "", body: "", category: "notice", pinned: false });
      setShowWrite(false);
      await loadNotices();
    } catch (e) {
      alert("저장 실패: " + e.message);
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    await adminNoticeApi("notice_delete", { id });
    setSelectedNotice(null);
    await loadNotices();
  };

  const filtered = notices.filter(n => category === "all" || n.category === category);

  // 상세 보기
  if (selectedNotice) {
    const n = selectedNotice;
    const cat = CAT_COLORS[n.category] || CAT_COLORS.notice;
    return (
      <div style={{ minHeight: "100vh", background: C.bg, color: C.text }}>
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 20px 80px" }}>
          <button onClick={() => setSelectedNotice(null)} style={{
            background: "none", border: "none", color: C.muted, cursor: "pointer",
            fontSize: 15, fontWeight: 500, display: "flex", alignItems: "center", gap: 6, padding: "8px 0", marginBottom: 24,
          }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            목록으로
          </button>

          <div style={{ padding: "5px 14px", borderRadius: 16, background: cat.bg, color: cat.color, fontSize: 13, fontWeight: 700, display: "inline-block", marginBottom: 16 }}>
            {cat.label}
          </div>
          {n.pinned && <span style={{ marginLeft: 8, fontSize: 12, color: "#ef4444", fontWeight: 700 }}>고정</span>}

          <h1 style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.3, marginBottom: 12 }}>{n.title}</h1>
          <div style={{ fontSize: 14, color: C.muted, marginBottom: 32 }}>{formatDate(n.created_at)}</div>

          <div style={{
            fontSize: 16, lineHeight: 2, whiteSpace: "pre-wrap", color: C.text,
            padding: "32px 0", borderTop: `1px solid ${C.border}`,
          }}>
            {n.body}
          </div>

          {isAdmin && n.id && (
            <div style={{ marginTop: 24, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
              <button onClick={() => handleDelete(n.id)} style={{
                padding: "8px 20px", borderRadius: 8, border: "1px solid #ef444440",
                background: "#ef444408", color: "#ef4444", fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}>삭제</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text }}>
      {/* 헤더 */}
      <section style={{ textAlign: "center", padding: "80px 20px 48px", maxWidth: 700, margin: "0 auto" }}>
        <div style={{
          display: "inline-block", padding: "6px 18px", borderRadius: 20,
          background: `${BRAND}10`, border: `1px solid ${BRAND}25`, color: BRAND, fontSize: 13, fontWeight: 600, marginBottom: 18,
        }}>Announcements</div>
        <h1 style={{ fontSize: "clamp(30px, 5vw, 42px)", fontWeight: 800, lineHeight: 1.25, marginBottom: 16, letterSpacing: -0.5 }}>
          공지사항
        </h1>
        <p style={{ fontSize: 16, color: C.muted, lineHeight: 1.8 }}>
          업데이트 현황, 공지, 이벤트 소식을 확인하세요.
        </p>
      </section>

      {/* 카테고리 + 관리자 글쓰기 */}
      <section style={{ maxWidth: 800, margin: "0 auto", padding: "0 20px 32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {CATEGORIES.map(c => (
              <button key={c.id} onClick={() => setCategory(c.id)} style={{
                padding: "8px 20px", borderRadius: 20, cursor: "pointer",
                fontSize: 14, fontWeight: 600, transition: "all 0.15s",
                border: `1.5px solid ${category === c.id ? BRAND : "transparent"}`,
                background: category === c.id ? BRAND : (C.bg === "#fff" ? "#f0f0f4" : "rgba(255,255,255,0.08)"),
                color: category === c.id ? "#fff" : C.muted,
              }}>{c.label}</button>
            ))}
          </div>
          {isAdmin && (
            <button onClick={() => setShowWrite(true)} style={{
              padding: "10px 20px", borderRadius: 12, border: "none",
              background: BRAND, color: "#fff",
              fontSize: 14, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
            }}>+ 공지 작성</button>
          )}
        </div>

        {/* 목록 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {filtered.map((n, idx) => {
            const cat = CAT_COLORS[n.category] || CAT_COLORS.notice;
            return (
              <div key={n.id || idx} onClick={() => setSelectedNotice(n)} style={{
                padding: "20px 24px", cursor: "pointer", transition: "background 0.15s",
                borderBottom: `1px solid ${C.border}`,
                background: n.pinned ? (C.bg === "#fff" ? "#fefce8" : "rgba(234,179,8,0.05)") : "transparent",
              }}
              onMouseEnter={e => e.currentTarget.style.background = C.bg === "#fff" ? "#f8f6ff" : "rgba(0,0,0,0.06)"}
              onMouseLeave={e => e.currentTarget.style.background = n.pinned ? (C.bg === "#fff" ? "#fefce8" : "rgba(234,179,8,0.05)") : "transparent"}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span style={{ padding: "3px 10px", borderRadius: 12, background: cat.bg, color: cat.color, fontSize: 12, fontWeight: 700 }}>
                    {cat.label}
                  </span>
                  {n.pinned && <span style={{ fontSize: 11, color: "#d97706", fontWeight: 700 }}>고정</span>}
                  <span style={{ marginLeft: "auto", fontSize: 13, color: C.muted }}>{formatDate(n.created_at)}</span>
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.4, color: C.text }}>{n.title}</div>
                <div style={{
                  fontSize: 14, color: C.muted, lineHeight: 1.6, marginTop: 6,
                  display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
                }}>{n.body}</div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px 20px", color: C.muted, fontSize: 15 }}>
              등록된 공지사항이 없습니다.
            </div>
          )}
        </div>
      </section>

      {/* 글쓰기 모달 */}
      {showWrite && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={() => setShowWrite(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} />
          <div style={{
            position: "relative", zIndex: 1, width: "100%", maxWidth: 600,
            background: C.bg === "#fff" ? "#fff" : "#1a1a2e", borderRadius: 20,
            padding: "36px 32px", boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>공지 작성</h2>
              <button onClick={() => setShowWrite(false)} style={{
                width: 32, height: 32, borderRadius: 8, border: `1px solid ${C.border}`,
                background: "transparent", cursor: "pointer", fontSize: 16, color: C.muted,
              }}>x</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: C.muted, marginBottom: 6, display: "block" }}>카테고리</label>
                <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 14 }}>
                  <option value="update">업데이트</option>
                  <option value="notice">공지</option>
                  <option value="event">이벤트</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: C.muted, marginBottom: 6, display: "block" }}>제목</label>
                <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="공지 제목을 입력하세요"
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 15, boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: C.muted, marginBottom: 6, display: "block" }}>내용</label>
                <textarea value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))}
                  placeholder="공지 내용을 입력하세요"
                  rows={10}
                  style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 15, lineHeight: 1.8, resize: "vertical", boxSizing: "border-box" }} />
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, cursor: "pointer" }}>
                <input type="checkbox" checked={form.pinned} onChange={e => setForm(p => ({ ...p, pinned: e.target.checked }))} />
                상단 고정
              </label>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 28, justifyContent: "flex-end" }}>
              <button onClick={() => setShowWrite(false)} style={{
                padding: "12px 28px", borderRadius: 12, border: `1px solid ${C.border}`,
                background: "transparent", color: C.muted, fontSize: 14, fontWeight: 600, cursor: "pointer",
              }}>취소</button>
              <button onClick={handleSave} disabled={saving} style={{
                padding: "12px 28px", borderRadius: 12, border: "none",
                background: `linear-gradient(135deg, ${BRAND}, #ec4899)`,
                color: "#fff", fontSize: 14, fontWeight: 700, cursor: saving ? "default" : "pointer",
                opacity: saving ? 0.6 : 1,
              }}>{saving ? "저장 중..." : "발행"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
