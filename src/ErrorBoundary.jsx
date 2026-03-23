import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          minHeight: "50vh", padding: "40px 24px", textAlign: "center",
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: "#ef4444", marginBottom: 8 }}>
            오류가 발생했습니다
          </div>
          <div style={{ fontSize: 14, color: "#888", lineHeight: 1.8, marginBottom: 24, maxWidth: 400 }}>
            일시적인 오류가 발생했어요.<br/>
            페이지를 새로고침하거나 다시 시도해주세요.
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => this.setState({ hasError: false, error: null })}
              style={{ padding: "10px 24px", borderRadius: 10, border: "1px solid #ddd", background: "transparent", color: "#666", fontSize: 14, cursor: "pointer", fontWeight: 600 }}>
              다시 시도
            </button>
            <button onClick={() => window.location.reload()}
              style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", fontSize: 14, cursor: "pointer", fontWeight: 700 }}>
              새로고침
            </button>
          </div>
          {this.state.error && (
            <div style={{ marginTop: 20, fontSize: 11, color: "#999", maxWidth: 500, wordBreak: "break-all" }}>
              {this.state.error.message}
            </div>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
