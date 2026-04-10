export default function ErrorDisplay({ message }: { message: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1rem",
        padding: "4rem",
        color: "var(--loss-light)",
      }}
    >
      <div style={{ fontSize: "2rem" }}>⚠</div>
      <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.2rem" }}>
        {message}
      </p>
    </div>
  );
}
