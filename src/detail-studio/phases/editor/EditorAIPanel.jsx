import React from "react";
import { PIPELINE_STEPS } from "../../constants.js";

export default function EditorAIPanel({
  D, text, muted, bdr, acc, isMobile,
  agentInput, setAgentInput, agentLoading, agentMessages,
  handleAgentSend, inputStyle,
}) {
  if (isMobile) return null;

  return (
    <div style={{ width: 300, borderLeft: `1px solid ${bdr}`, display: "flex", flexDirection: "column", background: D ? "rgba(0,0,0,0.2)" : "#fff", position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}>
      {/* 파이프라인 단계 */}
      <div style={{ padding: "16px", borderBottom: `1px solid ${bdr}` }}>
        {PIPELINE_STEPS.map((step, i) => {
          if (i === 0) return (
            <div key={step.id} style={{ padding: "8px 12px", borderRadius: 8, background: D ? "rgba(255,255,255,0.04)" : "#f9fafb", marginBottom: 14, fontSize: 12, color: text, fontWeight: 600, cursor: "pointer" }}>
              입력한 정보
            </div>
          );
          return (
            <div key={step.id}>
              <div style={{ display: "flex", justifyContent: "center", padding: "2px 0" }}>
                <div style={{ width: 2, height: 10, background: bdr }} />
              </div>
              <div style={{ padding: "8px 12px", borderRadius: 8, background: D ? "rgba(255,255,255,0.04)" : "#f9fafb", marginBottom: 4, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 14 }}>{"✓"}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: text }}>{step.label}</span>
                </div>
                <span style={{ fontSize: 10, color: "#22c55e", fontWeight: 700, padding: "1px 8px", borderRadius: 6, background: "rgba(34,197,94,0.1)" }}>완료됨</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 수정도우미 */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "16px" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: text, marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
          {"✦"} 수정도우미
        </div>

        {agentMessages.length === 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: muted, marginBottom: 6 }}>빠른 명령 (클릭하면 실행)</div>
            {[
              { label: "선택한 텍스트를 더 설득력 있게", prompt: "선택한 텍스트를 더 짧고 설득력 있게 다듬어줘" },
              { label: "카피라이팅 개선", prompt: "이 섹션의 카피라이팅을 더 신뢰도 있게 수정해줘" },
              { label: "톤앤매너 변경", prompt: "이 섹션의 톤앤매너를 더 따뜻하고 친근하게 바꿔줘" },
              { label: "전체 텍스트 축약", prompt: "이 섹션의 모든 텍스트를 30% 더 짧게 줄여줘" },
            ].map((item, qi) => (
              <button key={qi} onClick={() => { setAgentInput(item.prompt); handleAgentSend(item.prompt); }}
                style={{ display: "block", width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${bdr}`, background: D ? "rgba(255,255,255,0.04)" : "#fff", marginBottom: 4, fontSize: 11, color: text, cursor: "pointer", textAlign: "left" }}>
                {item.label}
              </button>
            ))}
          </div>
        )}

        {/* 메시지 */}
        <div style={{ flex: 1, overflowY: "auto", marginBottom: 12 }}>
          {agentMessages.map((msg, mi) => (
            <div key={mi} style={{ marginBottom: 14, padding: "10px 12px", borderRadius: 10, background: msg.role === "user" ? `${acc}15` : (D ? "rgba(255,255,255,0.04)" : "#f8f8f8"), border: `1px solid ${msg.role === "user" ? acc + "30" : bdr}` }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: msg.role === "user" ? acc : muted, marginBottom: 4 }}>{msg.role === "user" ? "나" : "수정도우미"}</div>
              <div style={{ fontSize: 12, color: text, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{msg.content}</div>
            </div>
          ))}
          {agentLoading && (
            <div style={{ padding: "10px 12px", borderRadius: 10, background: D ? "rgba(255,255,255,0.04)" : "#f8f8f8", border: `1px solid ${bdr}` }}>
              <div style={{ fontSize: 11, color: acc, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ display: "inline-block", width: 12, height: 12, border: `2px solid ${acc}`, borderColor: `${acc} transparent transparent transparent`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                AI가 수정하고 있어요...
              </div>
            </div>
          )}
        </div>

        {/* 입력 */}
        <div style={{ position: "relative" }}>
          <input value={agentInput} onChange={e => setAgentInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && agentInput.trim()) handleAgentSend(agentInput); }}
            placeholder="AI에게 요청하세요..."
            disabled={agentLoading}
            style={{ ...inputStyle, paddingRight: 40, fontSize: 12 }} />
          <button onClick={() => { if (agentInput.trim()) handleAgentSend(agentInput); }}
            disabled={agentLoading || !agentInput.trim()}
            style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: agentInput.trim() ? acc : muted, fontSize: 16, cursor: agentInput.trim() ? "pointer" : "default" }}>
            {"➤"}
          </button>
        </div>
      </div>

      {/* 하단 버튼 */}
      <div style={{ padding: "12px 16px", borderTop: `1px solid ${bdr}`, display: "flex", gap: 8 }}>
        <button style={{ flex: 1, padding: "10px", borderRadius: 10, border: `1px solid ${bdr}`, background: "transparent", color: text, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
          수동 저장
        </button>
        <button style={{ flex: 1, padding: "10px", borderRadius: 10, border: "none", background: acc, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
          다운로드
        </button>
      </div>
    </div>
  );
}
