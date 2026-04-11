"use client";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import type { ModifierMap, CityFreshness } from "@/types";

interface Props {
  city: string;
  modifierMap?: ModifierMap;
  freshness?: (CityFreshness & { itemCount?: number }) | null;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

function freshnessLabel(mins: number | null): string {
  if (mins === null) return "No data";
  const a = Math.abs(mins);
  if (a < 2) return "just now";
  if (a < 60) return `${Math.round(a)}m ago`;
  const h = a / 60;
  return h < 24 ? `${h.toFixed(1)}h ago` : `${(h / 24).toFixed(1)}d ago`;
}

export default function CityHoverCard({ city, modifierMap, freshness, children, className, style }: Props) {
  const econMods = (modifierMap?.[city] ?? []).filter((m) => m.type === "economic" && m.pct > 0);

  return (
    <HoverCard>
      <HoverCardTrigger>
        <Link
          href={`/cities/${city.toLowerCase()}`}
          className={className}
          style={{
            fontFamily: "'Playfair Display', serif",
            color: "var(--gold)",
            textDecoration: "none",
            cursor: "pointer",
            ...style,
          }}
        >
          {children ?? city}
        </Link>
      </HoverCardTrigger>
      <HoverCardContent
        style={{
          background: "var(--leather-light)",
          border: "1px solid var(--gold-dim)",
          borderRadius: 4,
          padding: "0.85rem 1rem",
          minWidth: 200,
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <div style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "1rem",
          fontWeight: 700,
          color: "var(--gold)",
          marginBottom: "0.5rem",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}>
          {city}
        </div>

        {freshness && (
          <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginBottom: "0.5rem", fontFamily: "'JetBrains Mono', monospace" }}>
            {freshness.itemCount ?? "—"} items · {freshnessLabel(freshness.ageMinutes)}
          </div>
        )}

        {econMods.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
            {econMods.map((m, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }} title={m.effectText}>
                <span style={{ fontSize: "0.82rem" }}>{m.emoji}</span>
                <span style={{ fontSize: "0.72rem", color: m.direction > 0 ? "var(--profit-light)" : "var(--loss-light)" }}>
                  {m.name} ({m.direction > 0 ? "+" : "-"}{m.pct}%)
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", fontStyle: "italic" }}>
            No active modifiers
          </div>
        )}

        <div style={{ marginTop: "0.6rem", paddingTop: "0.5rem", borderTop: "1px solid var(--border)", fontSize: "0.68rem", color: "var(--text-dim)" }}>
          Click to view city prices →
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
