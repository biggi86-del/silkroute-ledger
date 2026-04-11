"use client";

import PageWrapper from "@/components/PageWrapper";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorDisplay from "@/components/ErrorDisplay";
import RefreshButton from "@/components/RefreshButton";
import { useDataFetch } from "@/hooks/useDataFetch";
import type { CityModifier, ModifierMap } from "@/types";

interface ApiData {
  cities: string[];
  modifierMap: ModifierMap;
  fetchedAt?: string;
}

function EconomicModifierRow({ mod }: { mod: CityModifier }) {
  const hasPriceEffect = mod.pct > 0;
  return (
    <div style={{
      display: "flex",
      alignItems: "flex-start",
      gap: "0.75rem",
      padding: "0.7rem 0",
      borderBottom: "1px solid rgba(61,42,26,0.4)",
    }}>
      <span style={{ fontSize: "1.2rem", flexShrink: 0, lineHeight: 1.4 }}>{mod.emoji}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: "1rem",
          color: "var(--parchment)",
          fontWeight: 600,
        }}>
          {mod.name}
        </div>
        <div style={{
          fontSize: "0.78rem",
          color: "var(--text-muted)",
          marginTop: "0.15rem",
        }}>
          {mod.effectText}
        </div>
        {mod.categories.length > 0 && (
          <div style={{ marginTop: "0.25rem", display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
            {[...new Set(mod.categories)].map((cat) => (
              <span key={cat} style={{
                fontSize: "0.65rem",
                background: "rgba(201,162,74,0.1)",
                border: "1px solid rgba(201,162,74,0.25)",
                color: "var(--gold)",
                padding: "0.1rem 0.4rem",
                borderRadius: 2,
                letterSpacing: "0.05em",
                textTransform: "capitalize",
              }}>
                {cat}
              </span>
            ))}
          </div>
        )}
      </div>
      {hasPriceEffect && (
        <div style={{
          flexShrink: 0,
          textAlign: "right",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "1rem",
          fontWeight: 600,
          color: mod.direction > 0 ? "var(--profit-light)" : "var(--loss-light)",
        }}>
          {mod.direction > 0 ? "+" : "-"}{mod.pct}%
        </div>
      )}
    </div>
  );
}

function CityCharacterRow({ mod }: { mod: CityModifier }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "0.6rem",
      padding: "0.4rem 0",
      opacity: 0.55,
    }}>
      <span style={{ fontSize: "0.9rem" }}>{mod.emoji}</span>
      <div>
        <span style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: "0.9rem",
          color: "var(--text-muted)",
        }}>
          {mod.name}
        </span>
        {mod.effectText && mod.effectText !== mod.name && (
          <span style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginLeft: "0.5rem" }}>
            — {mod.effectText}
          </span>
        )}
      </div>
      <span style={{
        marginLeft: "auto",
        fontSize: "0.65rem",
        color: "var(--text-dim)",
        background: "var(--leather-mid)",
        padding: "0.1rem 0.4rem",
        borderRadius: 2,
      }}>
        {mod.type === "cultural" ? "cultural" : "language"}
      </span>
    </div>
  );
}

function CityCard({ city, mods }: { city: string; mods: CityModifier[] }) {
  const economic = mods.filter((m) => m.type === "economic");
  const character = mods.filter((m) => m.type !== "economic");

  // Only show economic modifiers that have a meaningful effect text
  const activeEcon = economic.filter((m) => m.pct > 0 || m.effectText.length > 5);
  const inactiveEcon = economic.filter((m) => m.pct === 0 && m.effectText.length <= 5);

  return (
    <div style={{
      background: "var(--leather-light)",
      border: "1px solid var(--border)",
      borderRadius: 4,
      overflow: "hidden",
    }}>
      {/* City header */}
      <div style={{
        padding: "0.85rem 1.25rem",
        borderBottom: "1px solid var(--border-gold)",
        background: "var(--leather-mid)",
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
      }}>
        <h2 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: "1.3rem",
          fontWeight: 700,
          color: "var(--gold)",
          margin: 0,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}>
          {city}
        </h2>
        <a href={`/cities/${city.toLowerCase()}`} style={{
          fontSize: "0.72rem",
          color: "var(--text-dim)",
          textDecoration: "none",
          marginLeft: "auto",
        }}>
          View prices →
        </a>
      </div>

      <div style={{ padding: "0.75rem 1.25rem" }}>
        {/* Economic modifiers */}
        {activeEcon.length > 0 ? (
          activeEcon.map((mod, i) => <EconomicModifierRow key={i} mod={mod} />)
        ) : (
          <div style={{
            padding: "0.75rem 0",
            fontSize: "0.82rem",
            color: "var(--text-dim)",
            fontStyle: "italic",
            fontFamily: "'Cormorant Garamond', serif",
          }}>
            No active economic modifiers
          </div>
        )}

        {/* City Character section */}
        {character.length > 0 && (
          <div style={{ marginTop: "0.75rem" }}>
            <div style={{
              fontSize: "0.65rem",
              color: "var(--text-dim)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: "0.35rem",
              paddingTop: "0.5rem",
              borderTop: "1px solid rgba(61,42,26,0.4)",
            }}>
              City Character — no price effect
            </div>
            {character.map((mod, i) => <CityCharacterRow key={i} mod={mod} />)}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ModifiersPage() {
  const { data, error, loading, refreshing, fetchedAt, refresh } = useDataFetch<ApiData>();

  if (error)   return <ErrorDisplay message={`Failed to load: ${error}`} />;
  if (loading) return <LoadingSpinner />;
  if (!data)   return null;

  const { cities, modifierMap } = data;
  const allMods = Object.values(modifierMap).flat();
  const economicCount = allMods.filter((m) => m.type === "economic" && m.pct > 0).length;

  return (
    <PageWrapper
      title="City Modifiers"
      subtitle={`${economicCount} active economic modifiers across ${cities.length} cities`}
      actions={<RefreshButton fetchedAt={fetchedAt} refreshing={refreshing} onRefresh={refresh} />}
    >
      {/* Legend */}
      <div style={{
        background: "var(--leather-light)",
        border: "1px solid var(--border)",
        borderRadius: 4,
        padding: "0.75rem 1.25rem",
        marginBottom: "1.5rem",
        fontSize: "0.78rem",
        color: "var(--text-muted)",
        display: "flex",
        gap: "1.5rem",
        flexWrap: "wrap",
      }}>
        <span>
          <span style={{ color: "var(--profit-light)", fontFamily: "'JetBrains Mono', monospace" }}>+X%</span>
          {" "}= price bonus for the specified goods when selling here
        </span>
        <span>
          <span style={{ color: "var(--loss-light)", fontFamily: "'JetBrains Mono', monospace" }}>-X%</span>
          {" "}= price penalty
        </span>
        <span style={{ opacity: 0.6 }}>
          Cultural / language modifiers shown greyed out — no effect on prices
        </span>
      </div>

      {/* City grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
        gap: "1rem",
        marginBottom: "1.5rem",
      }}>
        {cities.map((city) => (
          <CityCard
            key={city}
            city={city}
            mods={modifierMap[city] ?? []}
          />
        ))}
      </div>

      {/* No data state */}
      {cities.every((c) => !modifierMap[c]?.length) && (
        <div style={{
          textAlign: "center",
          padding: "3rem",
          color: "var(--text-dim)",
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: "1.1rem",
        }}>
          No modifier data found. Check that the "City Modifiers" tab exists in the Google Sheet
          and is shared with the service account.
        </div>
      )}

      <div style={{
        fontSize: "0.72rem",
        color: "var(--text-dim)",
        fontFamily: "'Cormorant Garamond', serif",
        marginTop: "0.5rem",
      }}>
        ✦ Modifier data is read from the "City Modifiers" tab in the Google Sheet. Refreshes every 60 seconds.
      </div>
    </PageWrapper>
  );
}
