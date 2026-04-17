import AuthModal from "./AuthModal";

export default function AuthPage({ C, onAuth, navigate }) {
  const isDark = C?.bg === "#0f1116" || C?.bg?.includes("0f1116");

  return (
    <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
      <div style={{ width: "100%", maxWidth: 440 }}>
        <AuthModal
          C={C}
          embedded
          onClose={() => navigate("home")}
          onAuth={(user) => { onAuth(user); navigate("home"); }}
        />
      </div>
    </div>
  );
}
