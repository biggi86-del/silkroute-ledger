export default function LoadingSpinner({ message = "Consulting the ledger…" }: { message?: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1.5rem",
        padding: "4rem",
        color: "var(--text-muted)",
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          border: "2px solid var(--border)",
          borderTop: "2px solid var(--gold)",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
        }}
      />
      <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.1rem", letterSpacing: "0.08em" }}>
        {message}
      </p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
