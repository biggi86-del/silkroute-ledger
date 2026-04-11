"use client";

interface Props {
  fetchedAt: string | null;
  refreshing: boolean;
  onRefresh: () => void;
}

export default function RefreshButton({ fetchedAt, refreshing, onRefresh }: Props) {
  const label = fetchedAt
    ? new Date(fetchedAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
      {label && (
        <span
          style={{
            fontSize: "0.7rem",
            color: "var(--text-dim)",
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          Refreshed: {label}
        </span>
      )}
      <button
        onClick={onRefresh}
        disabled={refreshing}
        style={{
          background: refreshing ? "var(--leather-mid)" : "var(--leather-light)",
          border: "1px solid var(--border-gold)",
          color: refreshing ? "var(--text-dim)" : "var(--gold)",
          padding: "0.3rem 0.8rem",
          borderRadius: 3,
          cursor: refreshing ? "not-allowed" : "pointer",
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: "0.9rem",
          letterSpacing: "0.05em",
          transition: "all 0.2s",
          whiteSpace: "nowrap",
        }}
      >
        {refreshing ? "Refreshing…" : "⟳ Refresh"}
      </button>
    </div>
  );
}
