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
              \uc785\ub825\ud55c \uc815\ubcf4
            </div>
          );
          return (
            <div key={step.id}>
              <div style={{ display: "flex", justifyContent: "center", padding: "2px 0" }}>
                <div style={{ width: 2, height: 10, background: bdr }} />
              </div>
              <div style={{ padding: "8px 12px", borderRadius: 8, background: D ? "rgba(255,255,255,0.04)" : "#f9fafb", marginBottom: 4, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 14 }}>{"\u2713"}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: text }}>{step.label}</span>
                </div>
                <span style={{ fontSize: 10, color: "#22c55e", fontWeight: 700, padding: "1px 8px", borderRadius: 6, background: "rgba(34,197,94,0.1)" }}>\uc644\ub8cc\ub428</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 수정도우미 */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "16px" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: text, marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
          {"\u2726"} \uc218\uc815\ub3c4\uc6b0\ubbf8
        </div>

        {agentMessages.length === 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: muted, marginBottom: 6 }}>\ube60\ub978 \uba85\ub839 (\ud074\ub9ad\ud558\uba74 \uc2e4\ud589)</div>
            {[
              { label: "\uc120\ud0dd\ud55c \ud14d\uc2a4\ud2b8\ub97c \ub354 \uc124\ub4dd\ub825 \uc788\uac8c", prompt: "\uc120\ud0dd\ud55c \ud14d\uc2a4\ud2b8\ub97c \ub354 \uc9e7\uace0 \uc124\ub4dd\ub825 \uc788\uac8c \ub2e4\ub4ec\uc5b4\uc918" },
              { label: "\uce74\ud53c\ub77c\uc774\ud305 \uac1c\uc120", prompt: "\uc774 \uc139\uc158\uc758 \uce74\ud53c\ub77c\uc774\ud305\uc744 \ub354 \uc2e0\ub8b0\ub3c4 \uc788\uac8c \uc218\uc815\ud574\uc918" },
              { label: "\ud1a4\uc564\ub9e4\ub108 \ubcc0\uacbd", prompt: "\uc774 \uc139\uc158\uc758 \ud1a4\uc564\ub9e4\ub108\ub97c \ub354 \ub530\ub73b\ud558\uace0 \uce5c\uadfc\ud558\uac8c \ubc14\uafd4\uc918" },
              { label: "\uc804\uccb4 \ud14d\uc2a4\ud2b8 \ucd95\uc57d", prompt: "\uc774 \uc139\uc158\uc758 \ubaa8\ub4e0 \ud14d\uc2a4\ud2b8\ub97c 30% \ub354 \uc9e7\uac8c \uc904\uc5ec\uc918" },
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
              <div style={{ fontSize: 10, fontWeight: 700, color: msg.role === "user" ? acc : muted, marginBottom: 4 }}>{msg.role === "user" ? "\ub098" : "\uc218\uc815\ub3c4\uc6b0\ubbf8"}</div>
              <div style={{ fontSize: 12, color: text, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{msg.content}</div>
            </div>
          ))}
          {agentLoading && (
            <div style={{ padding: "10px 12px", borderRadius: 10, background: D ? "rgba(255,255,255,0.04)" : "#f8f8f8", border: `1px solid ${bdr}` }}>
              <div style={{ fontSize: 11, color: acc, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ display: "inline-block", width: 12, height: 12, border: `2px solid ${acc}`, borderColor: `${acc} transparent transparent transparent`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                AI\uac00 \uc218\uc815\ud558\uace0 \uc788\uc5b4\uc694...
              </div>
            </div>
          )}
        </div>

        {/* 입력 */}
        <div style={{ position: "relative" }}>
          <input value={agentInput} onChange={e => setAgentInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && agentInput.trim()) handleAgentSend(agentInput); }}
            placeholder="AI\uc5d0\uac8c \uc694\uccad\ud558\uc138\uc694..."
            disabled={agentLoading}
            style={{ ...inputStyle, paddingRight: 40, fontSize: 12 }} />
          <button onClick={() => { if (agentInput.trim()) handleAgentSend(agentInput); }}
            disabled={agentLoading || !agentInput.trim()}
            style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: agentInput.trim() ? acc : muted, fontSize: 16, cursor: agentInput.trim() ? "pointer" : "default" }}>
            {"\u27a4"}
          </button>
        </div>
      </div>

      {/* 하단 버튼 */}
      <div style={{ padding: "12px 16px", borderTop: `1px solid ${bdr}`, display: "flex", gap: 8 }}>
        <button style={{ flex: 1, padding: "10px", borderRadius: 10, border: `1px solid ${bdr}`, background: "transparent", color: text, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
          \uc218\ub3d9 \uc800\uc7a5
        </button>
        <button style={{ flex: 1, padding: "10px", borderRadius: 10, border: "none", background: acc, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
          \ub2e4\uc6b4\ub85c\ub4dc
        </button>
      </div>
    </div>
  );
}
