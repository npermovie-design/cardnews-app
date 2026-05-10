import { useState, useEffect } from "react";
import { getAuthToken } from "./storage";

/* ══════════════════════════════════════════════════════
   SnsConnectionManager
   - SNS 계정 연결/해제 관리 UI
   - 티스토리, 스레드, 인스타, 네이버 블로그 지원
   ══════════════════════════════════════════════════════ */

const PLATFORMS = [
  {
    id: "tistory", label: "티스토리", color: "#FF6B35",
    icon: "/icon-tistory.png",
    desc: "클립보드 복사 + 에디터 열기",
    canAutoPublish: false,
    notice: "Open API 종료(2024.02) → 복사+열기 방식",
    manualOnly: true,
    editorUrl: "https://www.tistory.com/auth/login?redirectUrl=https%3A%2F%2Fwww.tistory.com%2Fm%2Fentry%2Fwrite",
  },
  {
    id: "threads", label: "스레드", color: "#000",
    icon: "/icon-threads.png",
    desc: "텍스트 게시물 자동 발행",
    authEndpoint: "/api/sns-auth-meta",
    canAutoPublish: true,
  },
  {
    id: "instagram", label: "인스타그램", color: "#E1306C",
    icon: "/icon-instagram.webp",
    desc: "카드뉴스 이미지 발행 (이미지 필수)",
    authEndpoint: "/api/sns-auth-meta",
    canAutoPublish: true,
    notice: "비즈니스/크리에이터 계정만 지원",
  },
  {
    id: "youtube", label: "YouTube", color: "#FF0000",
    icon: "/icon-youtube.png",
    desc: "영상 업로드 + 첫댓글 자동 발행",
    authEndpoint: "/api/sns-auth-google",
    canAutoPublish: true,
    notice: "Google 계정으로 연결 (YouTube 채널 필요)",
  },
  {
    id: "tiktok", label: "TikTok", color: "#010101",
    icon: null,
    desc: "영상 자동 발행",
    authEndpoint: "/api/sns-auth-tiktok",
    canAutoPublish: true,
  },
];

async function authHeaders(extra = {}) {
  const token = await getAuthToken();
  return token ? { ...extra, Authorization: `Bearer ${token}` } : extra;
}

export default function SnsConnectionManager({ user, isDark, compact = false }) {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(null); // platform id
  const [disconnecting, setDisconnecting] = useState(null);

  const text = isDark ? "#fff" : "#1a1a2e";
  const muted = isDark ? "rgba(255,255,255,0.45)" : "#888";
  const bdr = isDark ? "rgba(255,255,255,0.09)" : "#e5e5f0";
  const cardBg = isDark ? "rgba(255,255,255,0.04)" : "#fff";
  const acc = "#3b82f6";

  // 연결 목록 조회
  const fetchConnections = async () => {
    if (!user?.uid) { setLoading(false); return; }
    try {
      const res = await fetch(`/api/sns-connections?uid=${user.uid}`, { headers: await authHeaders() });
      const data = await res.json();
      setConnections(data.connections || []);
    } catch (e) {
      console.error("SNS 연결 조회 실패:", e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchConnections(); }, [user?.uid]);

  // URL 파라미터로 연결 성공/실패 확인
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("sns_connected")) {
      fetchConnections();
      // URL 정리
      const url = new URL(window.location);
      url.searchParams.delete("sns_connected");
      window.history.replaceState(null, "", url);
    }
    if (params.get("sns_error")) {
      alert("SNS 연결 실패: " + params.get("sns_error"));
      const url = new URL(window.location);
      url.searchParams.delete("sns_error");
      window.history.replaceState(null, "", url);
    }
  }, []);

  // OAuth 연결 시작
  const handleConnect = async (platform) => {
    if (!user?.uid) return;
    setConnecting(platform.id);
    try {
      const params = new URLSearchParams({ uid: user.uid });
      if (platform.id === "threads" || platform.id === "instagram") {
        params.set("platform", platform.id);
      }
      const res = await fetch(`${platform.authEndpoint}?${params}`, { headers: await authHeaders() });
      const data = await res.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        alert(data.error || "연결 실패");
        setConnecting(null);
      }
    } catch (e) {
      alert("연결 실패: " + e.message);
      setConnecting(null);
    }
  };

  // 연결 해제
  const handleDisconnect = async (platformId) => {
    if (!user?.uid || !confirm("연결을 해제하시겠습니까?")) return;
    setDisconnecting(platformId);
    try {
      await fetch(`/api/sns-connections?uid=${user.uid}&platform=${platformId}`, { method: "DELETE", headers: await authHeaders() });
      setConnections(prev => prev.filter(c => c.platform !== platformId));
    } catch (e) {
      alert("해제 실패: " + e.message);
    }
    setDisconnecting(null);
  };

  const isConnected = (id) => connections.some(c => c.platform === id);
  const getConnection = (id) => connections.find(c => c.platform === id);

  if (loading) return <div style={{ padding: 20, textAlign: "center", color: muted, fontSize: 13 }}>로딩 중...</div>;

  return (
    <div style={{ padding: compact ? 0 : "20px" }}>
      {!compact && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: text, marginBottom: 4 }}>SNS 계정 연동</div>
          <div style={{ fontSize: 13, color: muted }}>연결된 SNS에 생성된 글을 바로 발행할 수 있어요</div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {PLATFORMS.map(p => {
          const connected = isConnected(p.id);
          const conn = getConnection(p.id);
          const isLoading = connecting === p.id || disconnecting === p.id;

          return (
            <div key={p.id} style={{
              display: "flex", alignItems: "center", gap: 14,
              padding: compact ? "12px 14px" : "16px 18px",
              borderRadius: 14, border: `1px solid ${connected ? p.color + "40" : bdr}`,
              background: connected ? (isDark ? `${p.color}10` : `${p.color}05`) : cardBg,
            }}>
              {/* 아이콘 */}
              <div style={{
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                background: isDark ? `${p.color}20` : `${p.color}10`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {p.icon ? (
                  <img src={p.icon} alt="" style={{ width: 24, height: 24, objectFit: "contain", borderRadius: 4 }} />
                ) : p.id === "tiktok" ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill={isDark ? "#fff" : "#010101"}>
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.51a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.54a8.27 8.27 0 0 0 4.76 1.5V6.69h-1z"/>
                  </svg>
                ) : null}
              </div>

              {/* 정보 */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: text }}>{p.label}</span>
                  {connected && (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: "#4ade8020", color: "#4ade80", border: "1px solid #4ade8040" }}>
                      연결됨
                    </span>
                  )}
                  {p.canAutoPublish && (
                    <span style={{ fontSize: 9, fontWeight: 600, padding: "2px 6px", borderRadius: 8, background: `${acc}15`, color: acc }}>
                      자동발행
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>
                  {connected ? (conn.platform_username || conn.blog_name || "연결됨") : p.desc}
                </div>
                {p.notice && !connected && (
                  <div style={{ fontSize: 10, color: isDark ? "rgba(255,255,255,0.3)" : "#bbb", marginTop: 2 }}>{p.notice}</div>
                )}
              </div>

              {/* 버튼 */}
              <div style={{ flexShrink: 0 }}>
                {connected ? (
                  <button onClick={() => handleDisconnect(p.id)} disabled={isLoading}
                    style={{
                      padding: "8px 16px", borderRadius: 10, border: `1px solid ${isDark ? "rgba(248,113,113,0.3)" : "rgba(248,113,113,0.2)"}`,
                      background: "transparent", color: "#f87171", fontSize: 12, fontWeight: 700, cursor: "pointer",
                      opacity: isLoading ? 0.5 : 1,
                    }}>
                    {isLoading ? "해제 중..." : "해제"}
                  </button>
                ) : p.manualOnly ? (
                  <span style={{ fontSize: 11, color: muted, padding: "8px 12px" }}>수동 연동</span>
                ) : (
                  <button onClick={() => handleConnect(p)} disabled={isLoading || !user}
                    style={{
                      padding: "8px 18px", borderRadius: 10, border: "none",
                      background: `linear-gradient(135deg, ${p.color}, ${p.color}cc)`,
                      color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer",
                      opacity: isLoading || !user ? 0.5 : 1,
                    }}>
                    {isLoading ? "연결 중..." : "연결하기"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!user && (
        <div style={{ marginTop: 16, padding: "12px 16px", borderRadius: 12, background: isDark ? "rgba(245,158,11,0.1)" : "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.2)", fontSize: 12, color: "#f59e0b", textAlign: "center" }}>
          SNS 연동을 사용하려면 먼저 로그인해주세요
        </div>
      )}
    </div>
  );
}

// 연결된 SNS 목록 가져오기 (외부 컴포넌트에서 사용)
export async function getConnectedPlatforms(uid) {
  if (!uid) return [];
  try {
    const res = await fetch(`/api/sns-connections?uid=${uid}`, { headers: await authHeaders() });
    const data = await res.json();
    return data.connections || [];
  } catch { return []; }
}

// SNS 발행 함수
export async function publishToSns(uid, platform, { title, content, tags }) {
  const res = await fetch("/api/sns-publish", {
    method: "POST",
    headers: await authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ uid, platform, title, content, tags }),
  });
  return res.json();
}
