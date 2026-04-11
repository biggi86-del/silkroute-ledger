import React from "react";

interface Props {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export default function PageWrapper({ title, subtitle, children, actions }: Props) {
  return (
    <div style={{ padding: "2rem", maxWidth: 1400, margin: "0 auto" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginBottom: "0.5rem",
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "2rem",
              fontWeight: 800,
              color: "var(--gold)",
              margin: 0,
              letterSpacing: "0.01em",
            }}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              style={{
                color: "var(--text-dim)",
                fontSize: "0.8rem",
                marginTop: "0.25rem",
                fontFamily: "'Inter', sans-serif",
                letterSpacing: "0.02em",
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
        {actions && <div>{actions}</div>}
      </div>

      {/* Gold divider */}
      <div className="gold-divider" style={{ marginBottom: "1.5rem" }} />

      {children}
    </div>
  );
}
