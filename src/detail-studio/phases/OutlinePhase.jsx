import React from "react";
import { SECTION_TYPES } from "../constants.js";

export default function OutlinePhase({
  D, text, muted, bdr, acc, isMobile,
  sections, setSections, setPhase, setActiveSection, stockFilledRef,
}) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: D ? "transparent" : "#f5f5f5", overflow: "hidden" }}>
      <div style={{ flex: 1, overflowY: "auto", display: "flex", justifyContent: "center", padding: "24px 24px 0" }}>
        <div style={{ maxWidth: "min(600px, 100%)", width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: text, marginBottom: 6 }}>섹션 구성 확인</div>
          <div style={{ fontSize: 13, color: muted }}>포함할 섹션을 선택하고 순서를 변경하세요</div>
        </div>

        <div>
          <div style={{ fontSize: 12, color: muted, marginBottom: 12 }}>총 {sections.filter(s => s.enabled !== false).length}/{sections.length}개 섹션 선택됨</div>
          {sections.map((sec, i) => {
            const sType = SECTION_TYPES.find(t => t.id === sec.type);
            const enabled = sec.enabled !== false;
            // 섹션 타입별 미니 레이아웃 프리뷰 SVG
            const layoutMini = {
              full_image: <svg width="48" height="32" viewBox="0 0 48 32"><rect width="48" height="32" rx="3" fill={sec.bg_color || "#e8e0f0"} opacity="0.5"/><rect x="8" y="18" width="32" height="3" rx="1" fill={acc}/><rect x="14" y="23" width="20" height="2" rx="1" fill={acc} opacity="0.4"/></svg>,
              centered_text: <svg width="48" height="32" viewBox="0 0 48 32"><rect width="48" height="32" rx="3" fill={sec.bg_color || "#f8f8f8"} opacity="0.3"/><rect x="12" y="8" width="24" height="3" rx="1" fill={acc}/><rect x="8" y="14" width="32" height="2" rx="1" fill={muted} opacity="0.3"/><rect x="10" y="19" width="28" height="2" rx="1" fill={muted} opacity="0.3"/><rect x="14" y="24" width="20" height="2" rx="1" fill={muted} opacity="0.2"/></svg>,
              left_image_right_text: <svg width="48" height="32" viewBox="0 0 48 32"><rect width="48" height="32" rx="3" fill={sec.bg_color || "#f8f8f8"} opacity="0.3"/><rect x="3" y="4" width="18" height="24" rx="3" fill={acc} opacity="0.2"/><rect x="25" y="8" width="18" height="3" rx="1" fill={acc}/><rect x="25" y="14" width="16" height="2" rx="1" fill={muted} opacity="0.3"/><rect x="25" y="19" width="14" height="2" rx="1" fill={muted} opacity="0.3"/></svg>,
              right_image_left_text: <svg width="48" height="32" viewBox="0 0 48 32"><rect width="48" height="32" rx="3" fill={sec.bg_color || "#f8f8f8"} opacity="0.3"/><rect x="27" y="4" width="18" height="24" rx="3" fill={acc} opacity="0.2"/><rect x="3" y="8" width="18" height="3" rx="1" fill={acc}/><rect x="3" y="14" width="16" height="2" rx="1" fill={muted} opacity="0.3"/><rect x="3" y="19" width="14" height="2" rx="1" fill={muted} opacity="0.3"/></svg>,
              grid_2col: <svg width="48" height="32" viewBox="0 0 48 32"><rect width="48" height="32" rx="3" fill={sec.bg_color || "#f8f8f8"} opacity="0.3"/><rect x="3" y="4" width="20" height="12" rx="3" fill={acc} opacity="0.15"/><rect x="25" y="4" width="20" height="12" rx="3" fill={acc} opacity="0.15"/><rect x="3" y="19" width="20" height="9" rx="3" fill={acc} opacity="0.1"/><rect x="25" y="19" width="20" height="9" rx="3" fill={acc} opacity="0.1"/></svg>,
              grid_3col: <svg width="48" height="32" viewBox="0 0 48 32"><rect width="48" height="32" rx="3" fill={sec.bg_color || "#f8f8f8"} opacity="0.3"/><rect x="2" y="6" width="13" height="20" rx="2" fill={acc} opacity="0.15"/><rect x="17" y="6" width="14" height="20" rx="2" fill={acc} opacity="0.15"/><rect x="33" y="6" width="13" height="20" rx="2" fill={acc} opacity="0.15"/></svg>,
              card_list: <svg width="48" height="32" viewBox="0 0 48 32"><rect width="48" height="32" rx="3" fill={sec.bg_color || "#f8f8f8"} opacity="0.3"/><rect x="3" y="4" width="42" height="7" rx="2" fill={acc} opacity="0.12"/><rect x="3" y="13" width="42" height="7" rx="2" fill={acc} opacity="0.12"/><rect x="3" y="22" width="42" height="7" rx="2" fill={acc} opacity="0.12"/></svg>,
            };
            const miniSvg = layoutMini[sec.layout] || layoutMini.centered_text;
            const titleContent = sec.elements?.find(e => e.role === "title")?.content || "";
            return (
              <div key={sec.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderRadius: 12, border: `1.5px solid ${enabled ? acc + "35" : bdr}`, background: enabled ? (D ? "rgba(124,106,255,0.06)" : "#faf9ff") : (D ? "rgba(255,255,255,0.02)" : "#fafafa"), marginBottom: 14, opacity: enabled ? 1 : 0.4, transition: "all 0.15s" }}>
                {/* 체크박스 */}
                <button onClick={() => setSections(prev => prev.map((s, si) => si !== i ? s : { ...s, enabled: s.enabled === false ? true : false }))}
                  style={{ width: 24, height: 24, borderRadius: 7, border: `2px solid ${enabled ? acc : bdr}`, background: enabled ? acc : "transparent", color: "#fff", fontSize: 13, fontWeight: 900, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {enabled && <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 6l3 3 5-6" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </button>
                {/* 순서 변경 */}
                <div style={{ display: "flex", flexDirection: "column", gap: 1, flexShrink: 0 }}>
                  <button onClick={() => { if (i > 0) setSections(prev => { const a = [...prev]; [a[i-1],a[i]]=[a[i],a[i-1]]; return a; }); }}
                    style={{ width: 20, height: 14, border: "none", background: "transparent", color: muted, fontSize: 9, cursor: "pointer", padding: 0, opacity: i === 0 ? 0.2 : 0.7 }}>▲</button>
                  <button onClick={() => { if (i < sections.length-1) setSections(prev => { const a = [...prev]; [a[i],a[i+1]]=[a[i+1],a[i]]; return a; }); }}
                    style={{ width: 20, height: 14, border: "none", background: "transparent", color: muted, fontSize: 9, cursor: "pointer", padding: 0, opacity: i === sections.length-1 ? 0.2 : 0.7 }}>▼</button>
                </div>
                {/* 레이아웃 미니 프리뷰 */}
                <div style={{ flexShrink: 0, borderRadius: 6, overflow: "hidden", border: `1px solid ${bdr}`, background: D ? "rgba(255,255,255,0.03)" : "#fff" }}>
                  {miniSvg}
                </div>
                {/* 섹션 정보 */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: text }}>{sType?.label || sec.type}</div>
                  <div style={{ fontSize: 11, color: muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {titleContent || sType?.desc || ""}
                  </div>
                </div>
                {/* 삭제 버튼 */}
                <button onClick={() => setSections(prev => prev.filter((_, si) => si !== i))}
                  style={{ width: 24, height: 24, borderRadius: 6, border: "none", background: "transparent", color: muted, fontSize: 14, cursor: "pointer", flexShrink: 0, opacity: 0.4 }}
                  onMouseEnter={e => e.currentTarget.style.opacity = "1"}
                  onMouseLeave={e => e.currentTarget.style.opacity = "0.4"}>
                  x
                </button>
              </div>
            );
          })}
          {/* 섹션 추가 */}
          <button onClick={() => {
            const newSec = {
              id: `sec_add_${Date.now()}`, type: "point", layout: "centered_text",
              bg_color: "#ffffff", enabled: true, designVariant: Math.floor(Math.random() * 6),
              elements: [
                { type: "text", role: "title", content: "새 섹션 제목", fontSize: 28, fontWeight: "900", color: "#1a1a1a" },
                { type: "text", role: "body", content: "내용을 입력하세요", fontSize: 15, color: "#666" },
              ],
            };
            setSections(prev => [...prev, newSec]);
          }}
            style={{ width: "100%", padding: "14px", borderRadius: 12, border: `1.5px dashed ${bdr}`, background: "transparent", color: muted, fontSize: 13, cursor: "pointer", marginBottom: 14, transition: "all 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = acc; e.currentTarget.style.color = acc; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = bdr; e.currentTarget.style.color = muted; }}>
            + 섹션 추가
          </button>
        </div>
        {/* 예상 길이 */}
        <div style={{ textAlign: "center", padding: "12px 0 8px", fontSize: 11, color: muted }}>
          예상 길이: 약 {(sections.filter(s => s.enabled !== false).length * 1200).toLocaleString()}px
        </div>

        </div>
      </div>
      {/* 하단 고정 버튼 */}
      <div style={{ flexShrink: 0, padding: "16px 24px", borderTop: `1px solid ${bdr}`, background: D ? "rgba(0,0,0,0.3)" : "#fff", display: "flex", justifyContent: "center" }}>
        <div style={{ maxWidth: 600, width: "100%", display: "flex", gap: 10 }}>
          <button onClick={() => { setPhase("input"); }}
            style={{ flex: 1, padding: "14px", borderRadius: 12, border: `1px solid ${bdr}`, background: "transparent", color: muted, fontSize: 14, cursor: "pointer" }}>
            ← 다시 입력
          </button>
          <button onClick={() => {
            const enabledSecs = sections.filter(s => s.enabled !== false);
            setSections(enabledSecs);
            stockFilledRef.current = false; // 에디터 진입 시 스톡 이미지 자동 채우기 트리거
            setPhase("editor");
          }}
            style={{ flex: 2, padding: "14px", borderRadius: 12, border: "none", background: `linear-gradient(135deg, ${acc}, #9b6dff)`, color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer", boxShadow: `0 4px 16px ${acc}40` }}>
            편집 시작 ({sections.filter(s => s.enabled !== false).length}개 섹션) →
          </button>
        </div>
      </div>
    </div>
  );
}
