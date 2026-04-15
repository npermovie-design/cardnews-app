import React, { useReducer, useCallback, useEffect, lazy, Suspense } from "react";
import { THEMES, UI } from "../theme";
import { getTemplateById } from "./templates";
import { generatePageContent, recommendTemplate } from "./aiPipeline";

const InputStep = lazy(() => import("./InputStep"));
const AIAnalysisStep = lazy(() => import("./AIAnalysisStep"));
const GeneratingStep = lazy(() => import("./GeneratingStep"));
const EditorStep = lazy(() => import("./EditorStep"));

const initialState = {
  step: 1,
  // Step 1
  images: [],
  productName: "",
  language: "ko",
  selectedTemplateId: "auto",
  // Step 2
  analysisSubStep: 0,
  sellingPoints: [],
  brandName: "",
  brandLogo: null,
  designMood: null,
  qaAnswers: {},
  imageAnalysis: null,
  // Step 3
  genStage: 0,
  genMessage: "",
  // Step 4
  sections: [],
  selectedSectionId: null,
  selectedElementId: null,
  selectedElementType: null,
  canvasZoom: 100,
  chatMessages: [],
  template: null,
};

function reducer(state, action) {
  switch (action.type) {
    case "SET_STEP":
      return { ...state, step: action.step };
    case "SET_FIELD":
      return { ...state, [action.field]: action.value };
    case "ADD_IMAGE":
      return { ...state, images: [...state.images, action.payload] };
    case "REMOVE_IMAGE":
      return { ...state, images: state.images.filter((_, i) => i !== action.payload) };
    case "SET_SECTIONS":
      return { ...state, sections: action.payload };
    case "ADD_CHAT_MESSAGE":
      return { ...state, chatMessages: [...state.chatMessages, action.payload] };
    case "RESET":
      return { ...initialState };
    default:
      return state;
  }
}

export default function DetailPageStudioV2({ isDark, theme, user, showPointConfirm }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const C = THEMES[theme] || THEMES.light;
  const D = isDark || theme === "dark";
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  // Step 3 진입 시 생성 시작
  useEffect(() => {
    if (state.step === 3 && state.sections.length === 0) {
      runGeneration();
    }
  }, [state.step]);

  async function runGeneration() {
    // 포인트 차감
    if (showPointConfirm && user) {
      const ok = await showPointConfirm(30);
      if (!ok) {
        dispatch({ type: "SET_STEP", step: 2 });
        return;
      }
    }

    // 템플릿 결정
    let templateId = state.selectedTemplateId;
    if (templateId === "auto" && state.imageAnalysis) {
      templateId = await recommendTemplate(state.imageAnalysis);
    }
    const template = getTemplateById(templateId);
    dispatch({ type: "SET_FIELD", field: "template", value: template });

    // 콘텐츠 생성
    const productData = {
      productName: state.productName,
      sellingPoints: state.sellingPoints,
      designMood: state.designMood || template?.designMood || "clean",
      template,
      images: state.images,
      language: state.language,
      qaAnswers: state.qaAnswers,
    };

    const sections = await generatePageContent(productData, (stage, message, pct) => {
      dispatch({ type: "SET_FIELD", field: "genStage", value: stage });
      dispatch({ type: "SET_FIELD", field: "genMessage", value: message });
    });

    dispatch({ type: "SET_FIELD", field: "sections", value: sections });
    dispatch({ type: "SET_FIELD", field: "genStage", value: 5 });

    // 1초 후 에디터로 전환
    setTimeout(() => dispatch({ type: "SET_STEP", step: 4 }), 1200);
  }

  const Loader = () => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
      <div style={{
        width: 36, height: 36, border: `3px solid ${C.border || "#ddd"}`, borderTopColor: C.purple,
        borderRadius: "50%", animation: "spin 0.8s linear infinite",
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  // 에디터 모드는 전체화면
  if (state.step === 4) {
    return (
      <Suspense fallback={<Loader />}>
        <EditorStep state={state} dispatch={dispatch} C={C} isMobile={isMobile} />
      </Suspense>
    );
  }

  return (
    <div style={{ minHeight: "80vh" }}>
      {/* 상단 스텝 바 (에디터 제외) */}
      {state.step < 4 && (
        <div style={{
          display: "flex", justifyContent: "center", gap: 0,
          padding: "20px 16px 0", maxWidth: 480, margin: "0 auto",
        }}>
          {["입력", "AI 분석", "생성 중"].map((label, i) => {
            const stepNum = i + 1;
            const isActive = state.step === stepNum;
            const isDone = state.step > stepNum;
            return (
              <div key={i} style={{ display: "flex", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 700,
                    background: isDone ? C.purple : isActive ? C.purple : (C.border || "rgba(0,0,0,0.08)"),
                    color: isDone || isActive ? "#fff" : C.muted,
                  }}>
                    {isDone ? "v" : stepNum}
                  </div>
                  <span style={{
                    fontSize: 12, fontWeight: isActive ? 700 : 500,
                    color: isActive ? C.text : C.muted,
                  }}>{label}</span>
                </div>
                {i < 2 && (
                  <div style={{
                    width: 40, height: 2, margin: "0 8px",
                    background: isDone ? C.purple : (C.border || "rgba(0,0,0,0.1)"),
                  }} />
                )}
              </div>
            );
          })}
        </div>
      )}

      <Suspense fallback={<Loader />}>
        {state.step === 1 && <InputStep state={state} dispatch={dispatch} C={C} isMobile={isMobile} />}
        {state.step === 2 && <AIAnalysisStep state={state} dispatch={dispatch} C={C} isMobile={isMobile} />}
        {state.step === 3 && <GeneratingStep state={state} C={C} isMobile={isMobile} />}
      </Suspense>
    </div>
  );
}
