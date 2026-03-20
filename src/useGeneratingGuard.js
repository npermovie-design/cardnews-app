import { useEffect } from "react";

/**
 * useGeneratingGuard
 * - generating: true 일 때 페이지 이탈(뒤로가기, 탭 닫기, 새로고침) 방지
 * - App.jsx의 popstate와 연동하기 위해 window.__isGenerating 전역 플래그 사용
 */
export function useGeneratingGuard(generating, costPerUse = 10) {
  useEffect(() => {
    // 전역 플래그 설정 (App.jsx popstate에서 확인)
    window.__isGenerating = generating;
    window.__generatingCost = costPerUse;
    // AiPage.jsx에서 로딩 오버레이 표시를 위한 이벤트
    window.dispatchEvent(new CustomEvent("aiGeneratingChange", { detail: { generating } }));

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
  }, [generating, costPerUse]);

  // 컴포넌트 언마운트 시 플래그 초기화
  useEffect(() => {
    return () => {
      window.__isGenerating = false;
      window.__generatingCost = 0;
    };
  }, []);
}
