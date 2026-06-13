import { useEffect, useRef } from "react";
import { supabase } from "./storage";

const APP_FRAME_QUERY = (() => {
  if (typeof window === "undefined") return "?v=20260613-shorts-2gb-upload";
  const parts = ["v=20260613-shorts-2gb-upload"];
  return `?${parts.join("&")}`;
})();
const APP_FRAME_URL = `/naverbot-assets/index.html${APP_FRAME_QUERY}`;

function updateMeta(property, content) {
  let el = document.querySelector(`meta[property="${property}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("property", property);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

export default function CloudVersionPage({ user, navigate }) {
  const iframeRef = useRef(null);

  const syncAuthToFrame = async () => {
    const frame = iframeRef.current;
    if (!frame?.contentWindow) return;
    let session = null;
    try {
      const res = await supabase.auth.getSession();
      session = res?.data?.session || null;
    } catch {}
    frame.contentWindow.postMessage({
      type: "makeit-auth-sync",
      user: user || null,
      session: session ? {
        access_token: session.access_token || "",
        refresh_token: session.refresh_token || "",
        expires_at: session.expires_at || "",
        user: session.user ? {
          id: session.user.id,
          email: session.user.email,
          user_metadata: session.user.user_metadata || {},
          app_metadata: session.user.app_metadata || {},
        } : null,
      } : null,
    }, window.location.origin);
  };

  useEffect(() => {
    document.title = "앱버전 - SNS메이킷";
    updateMeta("og:title", "앱버전 - SNS메이킷");
    updateMeta("og:description", "SNS메이킷 앱버전에서 글쓰기와 콘텐츠 제작 흐름을 웹으로 확인하세요.");
    updateMeta("og:url", "https://snsmakeit.com/cloud");
    updateMeta("og:image", "https://snsmakeit.com/og-app.png");
    updateMeta("og:type", "website");

    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    const handleFrameMessage = (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "makeit-auth-request") {
        syncAuthToFrame();
      }
      if (event.data?.type === "makeit:navigate" && event.data.page === "programs") {
        if (typeof navigate === "function") navigate("programs");
      }
      if (event.data?.type === "makeit:navigate" && event.data.page === "home") {
        if (typeof navigate === "function") navigate("home");
      }
    };
    window.addEventListener("message", handleFrameMessage);

    return () => {
      window.removeEventListener("message", handleFrameMessage);
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, [navigate]);

  useEffect(() => {
    syncAuthToFrame();
    const timers = [300, 1000, 2500].map((delay) => setTimeout(syncAuthToFrame, delay));
    const { data } = supabase.auth.onAuthStateChange(() => {
      syncAuthToFrame();
      setTimeout(syncAuthToFrame, 300);
    });
    return () => {
      timers.forEach(clearTimeout);
      data?.subscription?.unsubscribe?.();
    };
  }, [user?.uid, user?.email]);

  return (
    <main style={{ height: "100dvh", boxSizing: "border-box", overflow: "hidden", background: "#111827" }}>
      <iframe
        ref={iframeRef}
        title="SNS메이킷 앱버전"
        src={APP_FRAME_URL}
        onLoad={syncAuthToFrame}
        style={{
          width: "100%",
          height: "100%",
          border: 0,
          display: "block",
          background: "#111827",
        }}
        allow="clipboard-read; clipboard-write; fullscreen; microphone; camera"
      />
    </main>
  );
}
