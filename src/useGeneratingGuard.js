import { useEffect } from "react";

/**
 * useGeneratingGuard
 * - generating: true 일 때 페이지 이탈(뒤로가기, 탭 닫기, 새로고침) 방지
 * - App.jsx의 popstate와 연동하기 위해 window.__isGenerating 전역 플래그 사용
 * - BackgroundTaskIndicator 연동: featureType 지정 시 백그라운드 작업 자동 등록
 */
export function useGeneratingGuard(generating, costPerUse = 10, featureType = "") {
  useEffect(() => {
    // 전역 플래그 설정 (App.jsx popstate에서 확인)
    window.__isGenerating = generating;
    window.__generatingCost = costPerUse;
    // AiPage.jsx에서 로딩 오버레이 표시를 위한 이벤트
    window.dispatchEvent(new CustomEvent("aiGeneratingChange", { detail: { generating } }));

    // 백그라운드 작업 인디케이터 연동
    if (featureType) {
      if (generating) {
        window.dispatchEvent(new CustomEvent("bgTaskUpdate", {
          detail: { action: "register", task: { id: `gen_${featureType}`, type: featureType, message: "생성 중..." } }
        }));
      } else {
        window.dispatchEvent(new CustomEvent("bgTaskUpdate", {
          detail: { action: "complete", task: { id: `gen_${featureType}` } }
        }));
      }
    }

    if (!generating) return;

    // 탭 닫기 / 새로고침
    const handleBeforeUnload = (e) => {
      const msg = `생성 중에 페이지를 나가면 결과물이 저장되지 않으며, ${costPerUse}P 포인트도 소진됩니다.`;
      e.preventDefault();
      e.returnValue = msg;
      return msg;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [generating, costPerUse, featureType]);

  // 컴포넌트 언마운트 시 플래그 초기화
  useEffect(() => {
    return () => {
      window.__isGenerating = false;
      window.__generatingCost = 0;
      // 백그라운드 작업도 제거
      if (featureType) {
        window.dispatchEvent(new CustomEvent("bgTaskUpdate", {
          detail: { action: "remove", task: { id: `gen_${featureType}` } }
        }));
      }
    };
  }, [featureType]);
}
