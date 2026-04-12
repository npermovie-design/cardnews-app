import React from "react";
import EditorSidebar, { SidebarTabBar } from "./editor/EditorSidebar.jsx";
import EditorCanvas from "./editor/EditorCanvas.jsx";
import EditorAIPanel from "./editor/EditorAIPanel.jsx";

export default function EditorPhase({
  D, text, muted, cardBg, bdr, inputBg, acc, isMobile,
  sections, setSections, activeSection, setActiveSection,
  selectedEl, setSelectedEl, sidebarTab, setSidebarTab,
  sidebarCollapsed, setSidebarCollapsed,
  sectionImages, setSectionImages, images, setImages,
  colorPalette, setColorPalette,
  templateTypeFilter, setTemplateTypeFilter,
  canvasZoom, setCanvasZoom,
  agentInput, setAgentInput, agentLoading, agentMessages,
  mediaSubTab, setMediaSubTab,
  stockImages, setStockImages,
  dragRef, snapGuide,
  setPhase, user, productName, extraInfo,
  generateSectionImage, generateAllImages, fetchStockImages, handleAgentSend,
  inputStyle,
}) {
  const themeProps = { D, text, muted, cardBg, bdr, inputBg, acc, isMobile };

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
      {/* 왼쪽 사이드바 */}
      <div style={{
        width: sidebarCollapsed ? 0 : 280, minWidth: sidebarCollapsed ? 0 : 280,
        borderRight: sidebarCollapsed ? "none" : `1px solid ${bdr}`,
        display: "flex", flexDirection: "column",
        background: D ? "rgba(0,0,0,0.2)" : "#fff",
        transition: "width 0.2s, min-width 0.2s", overflow: "hidden",
        position: "sticky", top: 0, height: "100vh", overflowY: "auto",
      }}>
        <SidebarTabBar {...{ sidebarTab, setSidebarTab, D, bdr, acc, muted }} />
        <EditorSidebar
          {...themeProps}
          {...{ sections, setSections, activeSection, setActiveSection,
            selectedEl, setSelectedEl, sidebarTab, setSidebarTab,
            sectionImages, setSectionImages, images, setImages,
            colorPalette, setColorPalette,
            templateTypeFilter, setTemplateTypeFilter,
            mediaSubTab, setMediaSubTab,
            stockImages, setStockImages,
            generateSectionImage, fetchStockImages, inputStyle }}
        />
      </div>

      {/* 캔버스 */}
      <EditorCanvas
        {...themeProps}
        {...{ sections, setSections, activeSection, setActiveSection,
          selectedEl, setSelectedEl,
          sectionImages, setSectionImages, images, colorPalette,
          canvasZoom, setCanvasZoom,
          sidebarCollapsed, setSidebarCollapsed,
          dragRef, snapGuide,
          setPhase, productName, extraInfo,
          generateSectionImage, generateAllImages }}
      />

      {/* 오른쪽 AI 패널 */}
      <EditorAIPanel
        {...themeProps}
        {...{ agentInput, setAgentInput, agentLoading, agentMessages,
          handleAgentSend, inputStyle }}
      />
    </div>
  );
}
