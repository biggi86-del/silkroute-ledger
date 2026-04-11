"use client";

import { useMemo, useState } from "react";
import PageWrapper from "@/components/PageWrapper";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorDisplay from "@/components/ErrorDisplay";
import RefreshButton from "@/components/RefreshButton";
import { useDataFetch } from "@/hooks/useDataFetch";
import type { PriceMap, ModifierMap, PlannerRoute, PlannerLeg, PlannerItem } from "@/types";
import { getModifierBonus } from "@/lib/modifiers-client";

interface ApiData {
  cities: string[];
  items: string[];
  priceMap: PriceMap;
  modifierMap: ModifierMap;
  fetchedAt?: string;
}

// ---------------------------------------------------------------------------
// Route planning algorithm
// ---------------------------------------------------------------------------
function permutations<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [arr];
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const perm of permutations(rest)) {
      result.push([arr[i], ...perm]);
    }
  }
  return result;
}

function getBestItemsForLeg(
  fromCity: string,
  toCity: string,
  priceMap: PriceMap,
  modifierMap: ModifierMap,
  items: string[],
  cargoSlots: number
): PlannerItem[] {
  const candidates: PlannerItem[] = [];

  for (const itemName of items) {
    const buyEntry = priceMap[itemName]?.[fromCity]?.Buy;
    if (!buyEntry) continue;

    const actualSell    = priceMap[itemName]?.[toCity]?.Sell;
    const estimatedSell = priceMap[itemName]?.[toCity]?.Buy;
    const sellEntry = actualSell ?? estimatedSell;
    if (!sellEntry) continue;

    const baseProfit = sellEntry.price - buyEntry.price;
    if (baseProfit <= 0) continue;

    // Skip locally produced items (deprioritise — they sell for less)
    if (sellEntry.local) continue;

    const { bonus, label } = getModifierBonus(itemName, toCity, modifierMap);
    const adjustedProfit = Math.round(baseProfit * (1 + bonus));

    candidates.push({
      itemName,
      buyPrice:        buyEntry.price,
      sellPrice:       sellEntry.price,
      profit:          adjustedProfit,
      profitConfirmed: !!actualSell,
      isLocal:         sellEntry.local,
      modifierLabel:   label,
    });
  }

  // Sort by adjusted profit descending, take top cargoSlots
  return candidates
    .sort((a, b) => b.profit - a.profit)
    .slice(0, cargoSlots);
}

function computeRoutes(
  selectedCities: string[],
  items: string[],
  priceMap: PriceMap,
  modifierMap: ModifierMap,
  cargoSlots: number
): PlannerRoute[] {
  if (selectedCities.length < 2) return [];

  const routes: PlannerRoute[] = [];

  // For loops, fix the first city to avoid duplicate rotational routes
  const [fixed, ...rest] = selectedCities;
  const restPerms = permutations(rest);

  for (const perm of restPerms) {
    const cityOrder = [fixed, ...perm];
    const legs: PlannerLeg[] = [];
    let totalProfit = 0;

    for (let i = 0; i < cityOrder.length; i++) {
      const fromCity = cityOrder[i];
      const toCity   = cityOrder[(i + 1) % cityOrder.length];

      const buy = getBestItemsForLeg(fromCity, toCity, priceMap, modifierMap, items, cargoSlots);
      // "sell" on this leg = items bought on the previous leg (going to this city)
      const prevFrom = cityOrder[(i - 1 + cityOrder.length) % cityOrder.length];
      const sell = getBestItemsForLeg(prevFrom, fromCity, priceMap, modifierMap, items, cargoSlots);

      const legProfit = buy.reduce((s, item) => s + item.profit, 0);
      totalProfit += legProfit;

      legs.push({ fromCity, toCity, buy, sell, legProfit });
    }

    routes.push({ cities: cityOrder, legs, totalProfit });
  }

  return routes.sort((a, b) => b.totalProfit - a.totalProfit);
}

// ---------------------------------------------------------------------------
// UI helpers
// ---------------------------------------------------------------------------
function CityBadge({ city, modifierMap }: { city: string; modifierMap: ModifierMap }) {
  const mods = modifierMap[city] ?? [];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
      <span style={{
        fontFamily: "'Cormorant Garamond', serif",
        fontSize: "1.1rem",
        fontWeight: 700,
        color: "var(--gold)",
        letterSpacing: "0.1em",
        textTransform: "uppercase",
      }}>
        {city}
      </span>
      {mods.map((m, i) => (
        <span key={i} title={`${m.name}: ${m.effectText}`}
          style={{ cursor: "help", fontSize: "1rem" }}>
          {m.emoji}
        </span>
      ))}
    </div>
  );
}

function LegBlock({ leg, isLast, modifierMap }: { leg: PlannerLeg; isLast: boolean; modifierMap: ModifierMap }) {
  return (
    <div style={{ display: "flex", gap: "1rem" }}>
      {/* Timeline spine */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 20 }}>
        <div style={{ width: 12, height: 12, borderRadius: "50%", background: "var(--gold)", border: "2px solid var(--gold-dim)", flexShrink: 0 }} />
        {!isLast && <div style={{ width: 2, flex: 1, background: "var(--border)", minHeight: 60 }} />}
      </div>

      {/* Content */}
      <div style={{ flex: 1, paddingBottom: "1.5rem" }}>
        <CityBadge city={leg.fromCity} modifierMap={modifierMap} />

        {/* Sell (items arriving) */}
        {leg.sell.length > 0 && (
          <div style={{ marginTop: "0.5rem" }}>
            <div style={{ fontSize: "0.68rem", color: "var(--text-dim)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.25rem" }}>
              Sell
            </div>
            {leg.sell.map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8rem", marginBottom: "0.15rem" }}>
                <span style={{ color: "var(--profit-light)", fontFamily: "'JetBrains Mono', monospace", minWidth: 60 }}>
                  +{item.profit}
                </span>
                <span style={{ color: "var(--parchment)" }}>{item.itemName}</span>
                {!item.profitConfirmed && (
                  <span style={{ fontSize: "0.65rem", color: "var(--text-dim)" }}>est.</span>
                )}
                {item.modifierLabel && (
                  <span title={item.modifierLabel} style={{ cursor: "help", fontSize: "0.8rem" }}>
                    {item.modifierLabel.split(" ")[0]}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Buy (items departing) */}
        {leg.buy.length > 0 && (
          <div style={{ marginTop: "0.5rem" }}>
            <div style={{ fontSize: "0.68rem", color: "var(--text-dim)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.25rem" }}>
              Buy → {leg.toCity}
            </div>
            {leg.buy.map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8rem", marginBottom: "0.15rem" }}>
                <span style={{ color: "var(--parchment)", fontFamily: "'JetBrains Mono', monospace", minWidth: 60 }}>
                  {item.buyPrice}
                </span>
                <span style={{ color: "var(--text-muted)" }}>{item.itemName}</span>
                <span style={{ color: "var(--profit-light)", fontSize: "0.72rem" }}>
                  (est. +{item.profit})
                </span>
              </div>
            ))}
          </div>
        )}

        {leg.sell.length === 0 && leg.buy.length === 0 && (
          <div style={{ fontSize: "0.78rem", color: "var(--text-dim)", marginTop: "0.4rem", fontStyle: "italic" }}>
            No profitable trades found for this stop
          </div>
        )}
      </div>
    </div>
  );
}

function RouteCard({ route, modifierMap, rank }: { route: PlannerRoute; modifierMap: ModifierMap; rank: number }) {
  const isTop = rank === 0;
  return (
    <div style={{
      background: "var(--leather-light)",
      border: `1px solid ${isTop ? "var(--gold-dim)" : "var(--border)"}`,
      borderTop: `2px solid ${isTop ? "var(--gold)" : "var(--border)"}`,
      borderRadius: 4,
      overflow: "hidden",
      marginBottom: "1rem",
    }}>
      {/* Header */}
      <div style={{
        padding: "0.9rem 1.25rem",
        borderBottom: "1px solid var(--border-gold)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "0.5rem",
      }}>
        <div>
          {isTop && (
            <div style={{ fontSize: "0.7rem", color: "var(--gold)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.2rem" }}>
              ✦ Best Route
            </div>
          )}
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1rem", color: "var(--parchment)" }}>
            {route.cities.join(" → ")} → {route.cities[0]}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "0.68rem", color: "var(--text-dim)", letterSpacing: "0.08em" }}>LOOP PROFIT</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "1.4rem", color: "var(--profit-light)", fontWeight: 600 }}>
            +{route.totalProfit.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div style={{ padding: "1.25rem 1.5rem" }}>
        {route.legs.map((leg, i) => (
          <LegBlock
            key={i}
            leg={leg}
            isLast={i === route.legs.length - 1}
            modifierMap={modifierMap}
          />
        ))}
        {/* Return arrow */}
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <div style={{ width: 12, height: 12, borderRadius: "50%", border: "2px solid var(--gold-dim)", background: "transparent", flexShrink: 0, marginLeft: 4 }} />
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "0.9rem", color: "var(--text-dim)", fontStyle: "italic" }}>
            → Return to {route.cities[0]}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function PlannerPage() {
  const { data, error, loading, refreshing, fetchedAt, refresh } =
    useDataFetch<ApiData>();

  const allCities = data?.cities ?? [];
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [cargoSlots, setCargoSlots] = useState(5);

  // Initialise selected cities once data loads
  const initialised = selectedCities.length > 0 || allCities.length === 0;
  if (!initialised && allCities.length > 0) {
    setSelectedCities(allCities);
  }

  const routes = useMemo(() => {
    if (!data || selectedCities.length < 2) return [];
    return computeRoutes(
      selectedCities,
      data.items,
      data.priceMap,
      data.modifierMap ?? {},
      cargoSlots
    ).slice(0, 4); // top 4 (show 1 best + 3 alternatives)
  }, [data, selectedCities, cargoSlots]);

  if (error) return <ErrorDisplay message={`Failed to load: ${error}`} />;
  if (loading) return <LoadingSpinner />;

  const modifierMap = data?.modifierMap ?? {};

  function toggleCity(city: string) {
    setSelectedCities((prev) =>
      prev.includes(city) ? prev.filter((c) => c !== city) : [...prev, city]
    );
  }

  const activeModifiers = Object.values(modifierMap).flat();

  return (
    <PageWrapper
      title="Route Planner"
      subtitle="Find the most profitable trading loop across multiple cities"
      actions={
        <RefreshButton fetchedAt={fetchedAt} refreshing={refreshing} onRefresh={refresh} />
      }
    >
      {/* Controls */}
      <div style={{
        background: "var(--leather-light)",
        border: "1px solid var(--border)",
        borderRadius: 4,
        padding: "1.25rem 1.5rem",
        marginBottom: "1.5rem",
        display: "flex",
        gap: "2rem",
        flexWrap: "wrap",
        alignItems: "flex-start",
      }}>
        {/* City checkboxes */}
        <div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "0.85rem", color: "var(--text-dim)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.6rem" }}>
            Cities to Include
          </div>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            {allCities.map((city) => {
              const active = selectedCities.includes(city);
              const mods = modifierMap[city] ?? [];
              return (
                <label key={city} style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  cursor: "pointer",
                  padding: "0.3rem 0.7rem",
                  borderRadius: 3,
                  border: `1px solid ${active ? "var(--gold)" : "var(--border)"}`,
                  background: active ? "rgba(201,162,74,0.08)" : "var(--leather-mid)",
                  color: active ? "var(--gold)" : "var(--text-muted)",
                  fontSize: "0.85rem",
                  fontFamily: "'Cormorant Garamond', serif",
                  transition: "all 0.15s",
                  userSelect: "none",
                }}>
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => toggleCity(city)}
                    style={{ accentColor: "var(--gold)", width: 12, height: 12 }}
                  />
                  {city}
                  {mods.map((m, i) => (
                    <span key={i} title={m.name} style={{ fontSize: "0.75rem" }}>{m.emoji}</span>
                  ))}
                </label>
              );
            })}
          </div>
        </div>

        {/* Cargo slots */}
        <div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "0.85rem", color: "var(--text-dim)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.6rem" }}>
            Cargo Slots
          </div>
          <div style={{ display: "flex", gap: "0.4rem" }}>
            {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
              <button key={n}
                onClick={() => setCargoSlots(n)}
                style={{
                  background: cargoSlots === n ? "var(--gold-dim)" : "var(--leather-mid)",
                  border: `1px solid ${cargoSlots === n ? "var(--gold)" : "var(--border)"}`,
                  color: cargoSlots === n ? "var(--parchment)" : "var(--text-muted)",
                  padding: "0.3rem 0.6rem",
                  borderRadius: 3,
                  cursor: "pointer",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "0.8rem",
                }}
              >
                {n}
              </button>
            ))}
          </div>
          <div style={{ fontSize: "0.68rem", color: "var(--text-dim)", marginTop: "0.3rem" }}>
            Different item types per leg
          </div>
        </div>
      </div>

      {/* Active modifiers banner */}
      {activeModifiers.length > 0 && (
        <div style={{
          background: "rgba(201,162,74,0.06)",
          border: "1px solid var(--border-gold)",
          borderRadius: 4,
          padding: "0.75rem 1.25rem",
          marginBottom: "1.5rem",
          display: "flex",
          flexWrap: "wrap",
          gap: "1rem",
          alignItems: "center",
        }}>
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "0.85rem", color: "var(--gold)", letterSpacing: "0.05em" }}>
            Active Modifiers:
          </span>
          {activeModifiers.map((m, i) => (
            <span key={i} title={m.effectText} style={{
              cursor: "help",
              fontSize: "0.78rem",
              color: m.direction > 0 ? "var(--profit-light)" : "var(--loss-light)",
            }}>
              {m.emoji} {m.city}: {m.name} ({m.direction > 0 ? "+" : "-"}{m.pct}%)
            </span>
          ))}
        </div>
      )}

      {/* Warning if < 2 cities */}
      {selectedCities.length < 2 && (
        <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-dim)", fontFamily: "'Cormorant Garamond', serif", fontSize: "1.1rem" }}>
          Select at least 2 cities to calculate routes.
        </div>
      )}

      {/* No routes found */}
      {selectedCities.length >= 2 && routes.length === 0 && (
        <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-dim)", fontFamily: "'Cormorant Garamond', serif", fontSize: "1.1rem" }}>
          No profitable routes found with current data. More price scans needed.
        </div>
      )}

      {/* Best route */}
      {routes.length > 0 && (
        <>
          <RouteCard route={routes[0]} modifierMap={modifierMap} rank={0} />

          {/* Alternative routes */}
          {routes.length > 1 && (
            <>
              <div style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "1.1rem",
                color: "var(--text-dim)",
                margin: "1.5rem 0 0.75rem",
                letterSpacing: "0.05em",
              }}>
                Alternative Routes
              </div>
              {routes.slice(1).map((route, i) => (
                <RouteCard key={i} route={route} modifierMap={modifierMap} rank={i + 1} />
              ))}
            </>
          )}
        </>
      )}

      <div style={{ marginTop: "1rem", fontSize: "0.72rem", color: "var(--text-dim)", fontFamily: "'Cormorant Garamond', serif" }}>
        ✦ Profits shown per slot per leg. Confirmed (✓) = real sell data. Estimated = buy price proxy. Modifier bonuses applied where city events are active.
      </div>
    </PageWrapper>
  );
}
