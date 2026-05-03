import React, { useState, useRef, useCallback } from "react";
import PreviewRenderer from "./PreviewRenderer";
import { callAI } from "../aiClient";
import { SECTION_TYPES } from "./templates";

export default function EditorStep({ state, dispatch, C, isMobile }) {
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);
  const [leftOpen, setLeftOpen] = useState(!isMobile);
  const [rightOpen, setRightOpen] = useState(!isMobile);

  const sections = state.sections || [];
  const colorScheme = state.template?.colorScheme || { primary: "#1a1a2e", secondary: "#555", background: "#ffffff", text: "#111", accent: "#3b82f6" };
  const selectedSec = sections.find(s => s.id === state.selectedSectionId);
  const selectedSecIdx = sections.findIndex(s => s.id === state.selectedSectionId);

  const onElementClick = useCallback((sectionId, elementId, elementType) => {
    dispatch({ type: "SET_FIELD", field: "selectedSectionId", value: sectionId });
    dispatch({ type: "SET_FIELD", field: "selectedElementId", value: elementId });
    dispatch({ type: "SET_FIELD", field: "selectedElementType", value: elementType });
    if (isMobile) setRightOpen(true);
  }, [dispatch, isMobile]);

  // 섹션 이동
  function moveSection(idx, dir) {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= sections.length) return;
    const newSections = [...sections];
    [newSections[idx], newSections[newIdx]] = [newSections[newIdx], newSections[idx]];
    dispatch({ type: "SET_FIELD", field: "sections", value: newSections });
  }

  // 섹션 삭제
  function deleteSection(idx) {
    const newSections = sections.filter((_, i) => i !== idx);
    dispatch({ type: "SET_FIELD", field: "sections", value: newSections });
    dispatch({ type: "SET_FIELD", field: "selectedSectionId", value: null });
  }

  // AI 채팅 수정
  async function handleChatSend() {
    if (!chatInput.trim() || chatLoading) return;
    const msg = chatInput.trim();
    setChatInput("");
    dispatch({ type: "ADD_CHAT_MESSAGE", payload: { role: "user", content: msg } });
    setChatLoading(true);

    try {
      const context = state.selectedSectionId && selectedSec
        ? `현재 선택된 섹션: ${selectedSec.type} (ID: ${selectedSec.id})\n섹션 데이터: ${JSON.stringify(selectedSec.data)}`
        : "선택된 섹션 없음";

      const prompt = `당신은 이커머스 상세페이지 편집 AI입니다.
현재 상세페이지의 섹션 목록: ${sections.map(s => s.type).join(", ")}
${context}

사용자 요청: "${msg}"

수정된 섹션 데이터를 JSON으로 반환하세요. 이모지를 절대 사용하지 마세요.
형식: {"sectionId": "수정할섹션ID", "data": {수정된 데이터 객체}}
수정이 필요 없으면: {"message": "응답 메시지"}`;

      const result = await callAI("claude-haiku-4-5", [{ role: "user", content: prompt }], 1500);
      const cleaned = result.replace(/```json?\s*/g, "").replace(/```/g, "").trim();

      try {
        const parsed = JSON.parse(cleaned);
        if (parsed.sectionId && parsed.data) {
          const newSections = sections.map(s =>
            s.id === parsed.sectionId ? { ...s, data: { ...s.data, ...parsed.data } } : s
          );
          dispatch({ type: "SET_FIELD", field: "sections", value: newSections });
          dispatch({ type: "ADD_CHAT_MESSAGE", payload: { role: "assistant", content: "수정을 완료했습니다." } });
        } else {
          dispatch({ type: "ADD_CHAT_MESSAGE", payload: { role: "assistant", content: parsed.message || "요청을 처리했습니다." } });
        }
      } catch {
        dispatch({ type: "ADD_CHAT_MESSAGE", payload: { role: "assistant", content: result.slice(0, 200) } });
      }
    } catch (e) {
      dispatch({ type: "ADD_CHAT_MESSAGE", payload: { role: "assistant", content: "오류가 발생했습니다. 다시 시도해주세요." } });
    }
    setChatLoading(false);
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }

  // 다운로드
  function handleDownload() {
    const iframe = document.querySelector("iframe[title='preview']");
    if (!iframe?.contentDocument) return;
    const html = iframe.contentDocument.documentElement.outerHTML;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${state.productName || "상세페이지"}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const sectionLabel = (type) => SECTION_TYPES.find(s => s.id === type)?.label || type;

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: C.bg || "#f5f5f5" }}>
      {/* 좌측 패널: 섹션 목록 */}
      {leftOpen && (
        <div style={{
          width: isMobile ? "100%" : 240, flexShrink: 0, background: C.card || "#fff",
          borderRight: `1px solid ${C.border || "rgba(0,0,0,0.06)"}`,
          display: "flex", flexDirection: "column", overflow: "hidden",
          position: isMobile ? "fixed" : "relative", inset: isMobile ? 0 : "auto",
          zIndex: isMobile ? 50 : 1,
        }}>
          <div style={{ padding: "14px 16px", borderBottom: `1px solid ${C.border || "rgba(0,0,0,0.06)"}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>섹션 목록</span>
            {isMobile && <button onClick={() => setLeftOpen(false)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: C.text }}>x</button>}
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
            {sections.map((sec, i) => (
              <div key={sec.id}
                onClick={() => { dispatch({ type: "SET_FIELD", field: "selectedSectionId", value: sec.id }); if (isMobile) setLeftOpen(false); }}
                style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "10px 12px",
                  borderRadius: 8, cursor: "pointer", marginBottom: 2,
                  background: state.selectedSectionId === sec.id ? (C.purpleBg || "rgba(0,0,0,0.06)") : "transparent",
                  border: state.selectedSectionId === sec.id ? `1px solid ${C.purple}30` : "1px solid transparent",
                  transition: "background 0.15s",
                }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: colorScheme.accent || C.purple, flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: C.text }}>{sectionLabel(sec.type)}</span>
                <div style={{ display: "flex", gap: 2 }}>
                  <button onClick={(e) => { e.stopPropagation(); moveSection(i, -1); }}
                    style={{ background: "none", border: "none", fontSize: 10, cursor: "pointer", color: C.muted, padding: "2px 4px" }}>^</button>
                  <button onClick={(e) => { e.stopPropagation(); moveSection(i, 1); }}
                    style={{ background: "none", border: "none", fontSize: 10, cursor: "pointer", color: C.muted, padding: "2px 4px", transform: "rotate(180deg)" }}>^</button>
                  <button onClick={(e) => { e.stopPropagation(); deleteSection(i); }}
                    style={{ background: "none", border: "none", fontSize: 11, cursor: "pointer", color: "#e53935", padding: "2px 4px" }}>x</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 중앙: 미리보기 */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* 상단 툴바 */}
        <div style={{
          padding: "8px 16px", display: "flex", alignItems: "center", gap: 10,
          borderBottom: `1px solid ${C.border || "rgba(0,0,0,0.06)"}`,
          background: C.card || "#fff", flexShrink: 0,
        }}>
          {!leftOpen && (
            <button onClick={() => setLeftOpen(true)} style={{
              background: "none", border: `1px solid ${C.border || "rgba(0,0,0,0.1)"}`, borderRadius: 6,
              padding: "4px 8px", fontSize: 12, cursor: "pointer", color: C.text,
            }}>섹션</button>
          )}
          <button onClick={() => dispatch({ type: "SET_STEP", step: 1 })} style={{
            background: "none", border: `1px solid ${C.border || "rgba(0,0,0,0.1)"}`, borderRadius: 6,
            padding: "4px 10px", fontSize: 12, cursor: "pointer", color: C.text,
          }}>다시 입력</button>

          <div style={{ flex: 1 }} />

          {/* 줌 */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button onClick={() => dispatch({ type: "SET_FIELD", field: "canvasZoom", value: Math.max(30, (state.canvasZoom || 100) - 10) })}
              style={{ background: "none", border: "none", fontSize: 16, cursor: "pointer", color: C.text }}>-</button>
            <span style={{ fontSize: 12, color: C.muted, minWidth: 36, textAlign: "center" }}>{state.canvasZoom || 100}%</span>
            <button onClick={() => dispatch({ type: "SET_FIELD", field: "canvasZoom", value: Math.min(150, (state.canvasZoom || 100) + 10) })}
              style={{ background: "none", border: "none", fontSize: 16, cursor: "pointer", color: C.text }}>+</button>
          </div>

          <button onClick={handleDownload} style={{
            padding: "6px 14px", borderRadius: 8, border: "none",
            background: C.purple, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer",
          }}>다운로드</button>

          {!rightOpen && (
            <button onClick={() => setRightOpen(true)} style={{
              background: "none", border: `1px solid ${C.border || "rgba(0,0,0,0.1)"}`, borderRadius: 6,
              padding: "4px 8px", fontSize: 12, cursor: "pointer", color: C.text,
            }}>AI</button>
          )}
        </div>

        {/* 미리보기 */}
        <div style={{ flex: 1, overflow: "auto" }}>
          <PreviewRenderer
            sections={sections}
            colorScheme={colorScheme}
            productImages={state.images}
            selectedSectionId={state.selectedSectionId}
            selectedElementId={state.selectedElementId}
            onElementClick={onElementClick}
            zoom={state.canvasZoom || 100}
          />
        </div>
      </div>

      {/* 우측 패널: AI 어시스턴트 + 속성 */}
      {rightOpen && (
        <div style={{
          width: isMobile ? "100%" : 320, flexShrink: 0, background: C.card || "#fff",
          borderLeft: `1px solid ${C.border || "rgba(0,0,0,0.06)"}`,
          display: "flex", flexDirection: "column", overflow: "hidden",
          position: isMobile ? "fixed" : "relative", inset: isMobile ? 0 : "auto",
          zIndex: isMobile ? 50 : 1,
        }}>
          <div style={{ padding: "14px 16px", borderBottom: `1px solid ${C.border || "rgba(0,0,0,0.06)"}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>AI 어시스턴트</span>
            <button onClick={() => setRightOpen(false)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: C.text }}>x</button>
          </div>

          {/* 선택된 섹션 속성 */}
          {selectedSec && (
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border || "rgba(0,0,0,0.06)"}` }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.purple, marginBottom: 8 }}>
                선택: {sectionLabel(selectedSec.type)}
              </div>

              {/* 텍스트 요소 편집 */}
              {state.selectedElementId && state.selectedElementType === "text" && (
                <div>
                  <label style={{ fontSize: 11, color: C.muted, display: "block", marginBottom: 4 }}>텍스트 편집</label>
                  <textarea
                    value={getElementContent(selectedSec, state.selectedElementId)}
                    onChange={(e) => updateElementContent(selectedSec, state.selectedElementId, e.target.value, sections, dispatch)}
                    style={{
                      width: "100%", minHeight: 60, padding: "8px 10px", borderRadius: 8, fontSize: 13,
                      border: `1px solid ${C.border || "rgba(0,0,0,0.1)"}`,
                      background: C.inputBg || "#fff", color: C.text, resize: "vertical",
                      outline: "none", boxSizing: "border-box", fontFamily: "inherit",
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {/* 채팅 메시지 */}
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
            {(state.chatMessages || []).length === 0 && (
              <div style={{ textAlign: "center", padding: "40px 10px" }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 8 }}>
                  AI에게 수정을 요청하세요
                </div>
                <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>
                  섹션을 클릭하여 선택한 후, 수정 요구사항을 입력하면 AI가 자동으로 수정합니다
                </p>
              </div>
            )}
            {(state.chatMessages || []).map((msg, i) => (
              <div key={i} style={{
                marginBottom: 10,
                textAlign: msg.role === "user" ? "right" : "left",
              }}>
                <div style={{
                  display: "inline-block", maxWidth: "85%", padding: "8px 14px", borderRadius: 12,
                  background: msg.role === "user" ? C.purple : (C.purpleBg || "rgba(0,0,0,0.06)"),
                  color: msg.role === "user" ? "#fff" : C.text,
                  fontSize: 13, lineHeight: 1.6,
                }}>
                  {msg.content}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div style={{ fontSize: 12, color: C.muted, padding: "4px 0" }}>AI가 수정 중...</div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* 채팅 입력 */}
          <div style={{
            padding: "12px 16px", borderTop: `1px solid ${C.border || "rgba(0,0,0,0.06)"}`,
            display: "flex", gap: 8,
          }}>
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleChatSend()}
              placeholder="수정 요구사항을 입력하세요"
              style={{
                flex: 1, padding: "10px 14px", borderRadius: 10, fontSize: 13,
                border: `1px solid ${C.border || "rgba(0,0,0,0.1)"}`,
                background: C.inputBg || "#fff", color: C.text, outline: "none",
              }}
            />
            <button onClick={handleChatSend} disabled={chatLoading} style={{
              padding: "10px 16px", borderRadius: 10, border: "none",
              background: C.purple, color: "#fff", fontSize: 13, fontWeight: 600,
              cursor: chatLoading ? "not-allowed" : "pointer", opacity: chatLoading ? 0.6 : 1,
            }}>전송</button>
          </div>
        </div>
      )}
    </div>
  );
}

// 헬퍼: 섹션 데이터에서 element 내용 가져오기
function getElementContent(sec, elementId) {
  const d = sec.data || {};
  if (elementId === "title") return d.title || "";
  if (elementId === "subtitle") return d.subtitle || "";
  if (elementId === "body") return d.body || "";
  if (elementId === "brandName") return d.brandName || "";
  if (elementId === "tagline") return d.tagline || "";
  if (elementId === "cta_btn") return d.buttonText || "";
  if (elementId?.startsWith("notice_")) {
    const idx = parseInt(elementId.split("_")[1]);
    return d.items?.[idx] || "";
  }
  if (elementId?.startsWith("item_")) {
    const idx = parseInt(elementId.split("_")[1]);
    return d.items?.[idx] || "";
  }
  if (elementId?.startsWith("feature_")) {
    const idx = parseInt(elementId.split("_")[1]);
    return d.features?.[idx] ? `${d.features[idx].title}\n${d.features[idx].desc}` : "";
  }
  return "";
}

// 헬퍼: element 내용 업데이트
function updateElementContent(sec, elementId, value, sections, dispatch) {
  const newData = { ...sec.data };
  if (elementId === "title") newData.title = value;
  else if (elementId === "subtitle") newData.subtitle = value;
  else if (elementId === "body") newData.body = value;
  else if (elementId === "brandName") newData.brandName = value;
  else if (elementId === "tagline") newData.tagline = value;
  else if (elementId === "cta_btn") newData.buttonText = value;
  else if (elementId?.startsWith("notice_") || elementId?.startsWith("item_")) {
    const idx = parseInt(elementId.split("_")[1]);
    newData.items = [...(newData.items || [])];
    newData.items[idx] = value;
  } else if (elementId?.startsWith("feature_")) {
    const idx = parseInt(elementId.split("_")[1]);
    const lines = value.split("\n");
    newData.features = [...(newData.features || [])];
    newData.features[idx] = { title: lines[0] || "", desc: lines.slice(1).join("\n") || "" };
  }

  const newSections = sections.map(s => s.id === sec.id ? { ...s, data: newData } : s);
  dispatch({ type: "SET_FIELD", field: "sections", value: newSections });
}
