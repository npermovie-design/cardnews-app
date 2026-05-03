import { useState, useEffect, createContext, useContext, useCallback } from "react";

const ToastContext = createContext({ show: () => {} });

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const show = useCallback((msg, type = "info", duration = 3000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);

  const colors = {
    success: { bg: "#22c55e", border: "rgba(74,222,128,0.4)" },
    error:   { bg: "#ef4444", border: "rgba(239,68,68,0.4)" },
    info:    { bg: "#3b82f6", border: "rgba(0,0,0,0.06)" },
    warning: { bg: "#f59e0b", border: "rgba(245,158,11,0.4)" },
  };

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {/* Toast container */}
      <div style={{ position: "fixed", top: 20, right: 20, zIndex: 99999, display: "flex", flexDirection: "column", gap: 8, pointerEvents: "none" }}>
        {toasts.map(t => {
          const c = colors[t.type] || colors.info;
          return (
            <div key={t.id} style={{
              padding: "12px 20px", borderRadius: 12, fontSize: 14, fontWeight: 700, color: "#fff",
              background: c.bg, border: "1px solid " + c.border,
              boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
              animation: "toast-in 0.3s ease", pointerEvents: "auto",
            }}>
              {t.msg}
            </div>
          );
        })}
      </div>
      <style>{`@keyframes toast-in{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}`}</style>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
