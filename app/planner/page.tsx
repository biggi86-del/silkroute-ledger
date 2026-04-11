"use client";

import { useMemo, useState } from "react";
import PageWrapper from "@/components/PageWrapper";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorDisplay from "@/components/ErrorDisplay";
import RefreshButton from "@/components/RefreshButton";
import { useDataFetch } from "@/hooks/useDataFetch";
import type { PriceMap, ModifierMap, PlannerRoute, PlannerLeg, PlannerItem } from "@/types";
import { computeRoutes } from "@/lib/planner";

interface ApiData {
  cities: string[];
  items: string[];
  priceMap: PriceMap;
  modifierMap: ModifierMap;
  fetchedAt?: string;
}

// UI — redesigned
// ---------------------------------------------------------------------------

/** One-line route summary bar at the top of each route card */
function RouteSummaryBar({ route, rank }: { route: PlannerRoute; rank: number }) {
  const totalSlots  = route.legs[0]?.totalSlots ?? 0;
  const totalTrades = route.legs.reduce((s, l) => s + l.sell.reduce((ss, i) => ss + i.slots, 0), 0);
  const isTop = rank === 0;
  return (
    <div style={{
      background: isTop ? "rgba(201,162,74,0.07)" : "var(--leather-mid)",
      borderBottom: "1px solid var(--border-gold)",
      padding: "0.9rem 1.25rem",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      flexWrap: "wrap",
      gap: "0.75rem",
    }}>
      <div>
        {isTop && (
          <div style={{ fontSize: "0.68rem", color: "var(--gold)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.2rem" }}>
            ✦ Best Route
          </div>
        )}
        <div style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: "1.05rem",
          color: "var(--parchment)",
          letterSpacing: "0.03em",
        }}>
          {route.cities.join(" → ")} → {route.cities[0]}
        </div>
      </div>
      <div style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "0.65rem", color: "var(--text-dim)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Total Profit</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "1.3rem", color: "var(--profit-light)", fontWeight: 600 }}>
            +{route.totalProfit.toLocaleString()}
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "0.65rem", color: "var(--text-dim)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Stops</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "1.1rem", color: "var(--parchment)" }}>{route.cities.length}</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "0.65rem", color: "var(--text-dim)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Trades</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "1.1rem", color: "var(--parchment)" }}>{totalTrades} units</div>
        </div>
      </div>
    </div>
  );
}

/** Left half of a stop card — SELL HERE */
function SellPanel({ items, city }: { items: PlannerItem[]; city: string }) {
  const totalEarned = items.reduce((s, i) => s + i.quantityProfit, 0);
  return (
    <div style={{
      flex: 1,
      background: "rgba(74,124,89,0.08)",
      border: "1px solid rgba(74,124,89,0.2)",
      borderRadius: 3,
      padding: "0.75rem 1rem",
      minWidth: 0,
    }}>
      <div style={{
        fontFamily: "'Cormorant Garamond', serif",
        fontSize: "0.7rem",
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: "var(--profit-light)",
        marginBottom: "0.5rem",
        display: "flex",
        justifyContent: "space-between",
      }}>
        <span>↓ Sell Here</span>
        {items.length > 0 && (
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.72rem" }}>
            +{totalEarned}
          </span>
        )}
      </div>
      {items.length === 0 ? (
        <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", fontStyle: "italic" }}>
          Nothing to sell here
        </div>
      ) : items.map((item, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.3rem", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--parchment)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {item.itemName}
            {item.modifierLabel && (
              <span title={item.modifierLabel} style={{ cursor: "help", marginLeft: "0.3rem", fontSize: "0.75rem" }}>
                {item.modifierLabel.split(" ")[0]}
              </span>
            )}
          </span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.78rem", color: "var(--profit-light)", fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0 }}>
            ×{item.slots} · +{item.profit}{!item.profitConfirmed && <span style={{ fontSize: "0.6rem", color: "var(--text-dim)" }}> est.</span>} = <strong>+{item.quantityProfit.toLocaleString()}</strong>
          </span>
        </div>
      ))}
    </div>
  );
}

/** Right half of a stop card — BUY HERE with quantity allocation */
function BuyPanel({ items, nextCity, leg }: { items: PlannerItem[]; nextCity: string; leg: PlannerLeg }) {
  const totalSpend         = items.reduce((s, i) => s + i.buyPrice * i.slots, 0);
  const totalQuantityProfit = items.reduce((s, i) => s + i.quantityProfit, 0);
  const slotsUsed          = leg.slotsUsed;
  const totalSlots         = leg.totalSlots;

  return (
    <div style={{
      flex: 1,
      background: "rgba(201,162,74,0.06)",
      border: "1px solid rgba(201,162,74,0.18)",
      borderRadius: 3,
      padding: "0.75rem 1rem",
      minWidth: 0,
    }}>
      {/* Header */}
      <div style={{
        fontFamily: "'Cormorant Garamond', serif",
        fontSize: "0.7rem",
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: "var(--gold)",
        marginBottom: "0.5rem",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <span>↑ Buy for {nextCity}</span>
        {items.length > 0 && (
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.72rem", color: "var(--loss-light)" }}>
            -{totalSpend.toLocaleString()}
          </span>
        )}
      </div>

      {/* Item rows with slot allocation */}
      {items.length === 0 ? (
        <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", fontStyle: "italic" }}>
          Nothing profitable to buy
        </div>
      ) : (
        <>
          {/* Column headers */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 52px 60px 70px 70px",
            gap: "0.3rem",
            marginBottom: "0.25rem",
            fontSize: "0.6rem",
            color: "var(--text-dim)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            padding: "0 0 0.2rem",
            borderBottom: "1px solid rgba(61,42,26,0.4)",
          }}>
            <span>Item</span>
            <span style={{ textAlign: "right" }}>×Slots</span>
            <span style={{ textAlign: "right" }}>Cost ea</span>
            <span style={{ textAlign: "right" }}>+Profit ea</span>
            <span style={{ textAlign: "right" }}>= Total</span>
          </div>

          {items.map((item, i) => (
            <div key={i} style={{
              display: "grid",
              gridTemplateColumns: "1fr 52px 60px 70px 70px",
              gap: "0.3rem",
              alignItems: "center",
              marginBottom: "0.25rem",
              fontSize: "0.78rem",
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              <span style={{ color: "var(--parchment)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "0.75rem" }}>
                {item.itemName}
                {item.modifierLabel && (
                  <span title={item.modifierLabel} style={{ cursor: "help", marginLeft: "0.2rem", fontSize: "0.7rem" }}>
                    {item.modifierLabel.split(" ")[0]}
                  </span>
                )}
              </span>
              <span style={{ textAlign: "right", color: "var(--gold)", fontWeight: 600 }}>
                ×{item.slots}
              </span>
              <span style={{ textAlign: "right", color: "var(--text-muted)" }}>
                {item.buyPrice.toLocaleString()}
              </span>
              <span style={{ textAlign: "right", color: "var(--profit-light)" }}>
                +{item.profit.toLocaleString()}
                {!item.profitConfirmed && (
                  <span style={{ fontSize: "0.58rem", color: "var(--text-dim)" }}> est.</span>
                )}
              </span>
              <span style={{ textAlign: "right", color: "var(--profit-light)", fontWeight: 600 }}>
                +{item.quantityProfit.toLocaleString()}
              </span>
            </div>
          ))}

          {/* Footer: slots filled + total profit */}
          <div style={{
            borderTop: "1px solid rgba(201,162,74,0.2)",
            marginTop: "0.4rem",
            paddingTop: "0.4rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
            <span style={{
              fontSize: "0.72rem",
              color: slotsUsed === totalSlots ? "var(--profit-light)" : "var(--gold)",
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              {slotsUsed}/{totalSlots} slots filled
            </span>
            <span style={{
              fontSize: "0.72rem",
              color: "var(--profit-light)",
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              Est. profit: +{totalQuantityProfit.toLocaleString()}
            </span>
          </div>
          <div style={{ fontSize: "0.62rem", color: "var(--text-dim)", marginTop: "0.2rem", fontStyle: "italic" }}>
            Assumes unlimited stock. Adjust manually if a store runs out.
          </div>
        </>
      )}
    </div>
  );
}

/** Per-stop summary bar */
function StopSummaryBar({ leg, modifierMap }: { leg: PlannerLeg; modifierMap: ModifierMap }) {
  const mods   = (modifierMap[leg.fromCity] ?? []).filter((m) => m.type === "economic" && m.pct > 0);
  const earned = leg.sell.reduce((s, i) => s + i.quantityProfit, 0);  // quantity-adjusted
  const spent  = leg.buy.reduce((s, i)  => s + i.buyPrice * i.slots, 0);
  const net    = earned - spent;
  return (
    <div style={{ marginTop: "0.6rem", padding: "0.45rem 0.75rem", background: "var(--leather-mid)", borderRadius: 3, display: "flex", flexWrap: "wrap", gap: "0.5rem 1.5rem", alignItems: "center", fontSize: "0.73rem" }}>
      <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "0.9rem", color: "var(--gold)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
        {leg.fromCity}
        {mods.map((m, i) => (
          <span key={i} title={`${m.name}: ${m.effectText}`} style={{ marginLeft: "0.3rem", cursor: "help" }}>
            {m.emoji}
            <span style={{ fontSize: "0.65rem", color: m.direction > 0 ? "var(--profit-light)" : "var(--loss-light)", marginLeft: "0.1rem" }}>
              {m.name} ({m.direction > 0 ? "+" : "-"}{m.pct}%)
            </span>
          </span>
        ))}
      </span>
      <span style={{ color: "var(--text-dim)" }}>|</span>
      <span style={{ color: "var(--profit-light)" }}>
        Sell → <strong style={{ fontFamily: "'JetBrains Mono', monospace" }}>+{earned.toLocaleString()}</strong>
      </span>
      <span style={{ color: "var(--text-dim)" }}>|</span>
      <span style={{ color: "var(--gold)" }}>
        Buy → <strong style={{ fontFamily: "'JetBrains Mono', monospace" }}>{leg.slotsUsed}/{leg.totalSlots} slots, -{spent.toLocaleString()}</strong>
      </span>
      <span style={{ color: "var(--text-dim)" }}>|</span>
      <span style={{ color: net >= 0 ? "var(--profit-light)" : "var(--loss-light)" }}>
        Net: <strong style={{ fontFamily: "'JetBrains Mono', monospace" }}>{net >= 0 ? "+" : ""}{net.toLocaleString()}</strong>
      </span>
    </div>
  );
}

/** Arrow connector between stops showing cargo being carried */
function CargoConnector({ items, toCity }: { items: PlannerItem[]; toCity: string }) {
  if (items.length === 0) return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.6rem 0", color: "var(--text-dim)", fontSize: "0.72rem" }}>
      <div style={{ width: 2, height: 32, background: "var(--border)", margin: "0 9px" }} />
      <span style={{ fontStyle: "italic" }}>No cargo → {toCity}</span>
    </div>
  );
  const totalSlots  = items.reduce((s, i) => s + i.slots, 0);
  const cargoProfit = items.reduce((s, i) => s + i.quantityProfit, 0);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.5rem 0" }}>
      {/* Spine line */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 20, alignSelf: "stretch" }}>
        <div style={{ width: 2, flex: 1, background: "var(--border-gold)", opacity: 0.5 }} />
      </div>
      {/* Cargo pill */}
      <div style={{
        background: "rgba(201,162,74,0.06)",
        border: "1px dashed rgba(201,162,74,0.3)",
        borderRadius: 3,
        padding: "0.35rem 0.85rem",
        fontSize: "0.72rem",
        color: "var(--text-muted)",
        display: "flex",
        gap: "0.75rem",
        flexWrap: "wrap",
        alignItems: "center",
      }}>
        <span style={{ color: "var(--gold)", fontFamily: "'Cormorant Garamond', serif", fontSize: "0.78rem" }}>
          Carrying to {toCity}:
        </span>
        {items.map((item, i) => (
          <span key={i} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.7rem" }}>
            {item.itemName} ×{item.slots}
          </span>
        ))}
        <span style={{ color: "var(--text-dim)", borderLeft: "1px solid var(--border)", paddingLeft: "0.75rem" }}>
          {totalSlots} slots · Est. profit: <strong style={{ color: "var(--profit-light)" }}>+{cargoProfit.toLocaleString()}</strong>
        </span>
      </div>
    </div>
  );
}

/** Full stop card: summary bar + sell/buy panels side by side */
function StopCard({ leg, modifierMap }: { leg: PlannerLeg; modifierMap: ModifierMap }) {
  return (
    <div style={{ marginBottom: "0.25rem" }}>
      <StopSummaryBar leg={leg} modifierMap={modifierMap} />
      <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
        <SellPanel items={leg.sell} city={leg.fromCity} />
        <BuyPanel  items={leg.buy}  nextCity={leg.toCity} leg={leg} />
      </div>
    </div>
  );
}

/** Full route card */
function RouteCard({ route, modifierMap, rank }: { route: PlannerRoute; modifierMap: ModifierMap; rank: number }) {
  const isTop = rank === 0;
  return (
    <div style={{
      background: "var(--leather-light)",
      border: `1px solid ${isTop ? "var(--gold-dim)" : "var(--border)"}`,
      borderTop: `2px solid ${isTop ? "var(--gold)" : "var(--border)"}`,
      borderRadius: 4,
      overflow: "hidden",
      marginBottom: "1.25rem",
    }}>
      <RouteSummaryBar route={route} rank={rank} />

      <div style={{ padding: "1rem 1.25rem" }}>
        {route.legs.map((leg, i) => (
          <div key={i}>
            <StopCard leg={leg} modifierMap={modifierMap} />
            {/* Cargo connector — show what's being carried to the next city */}
            <CargoConnector items={leg.buy} toCity={leg.toCity} />
          </div>
        ))}

        {/* Return home */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          padding: "0.4rem 0.75rem",
          background: "var(--leather-mid)",
          borderRadius: 3,
          fontSize: "0.78rem",
          color: "var(--text-dim)",
          fontFamily: "'Cormorant Garamond', serif",
          fontStyle: "italic",
        }}>
          <span style={{ fontSize: "1rem" }}>↩</span>
          Return to {route.cities[0]} — loop complete
        </div>
      </div>
    </div>
  );
}

/** Collapsible quick guide */
function QuickGuide() {
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      background: "var(--leather-light)",
      border: "1px solid var(--border)",
      borderRadius: 4,
      marginBottom: "1.25rem",
      overflow: "hidden",
    }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          background: "none",
          border: "none",
          padding: "0.75rem 1.25rem",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          color: "var(--text-muted)",
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: "0.95rem",
          letterSpacing: "0.04em",
        }}
      >
        <span>📖 How to read this route</span>
        <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>{open ? "▲ collapse" : "▼ expand"}</span>
      </button>
      {open && (
        <div style={{
          padding: "0.75rem 1.25rem 1rem",
          borderTop: "1px solid var(--border)",
          fontSize: "0.82rem",
          color: "var(--text-muted)",
          lineHeight: 1.7,
        }}>
          <ol style={{ margin: 0, paddingLeft: "1.2rem" }}>
            <li><strong style={{ color: "var(--parchment)" }}>Start at the first city</strong> in the route.</li>
            <li>At each stop, sell everything listed under <span style={{ color: "var(--profit-light)" }}>↓ Sell Here</span> — these are items you carried from the previous city.</li>
            <li>Then buy everything listed under <span style={{ color: "var(--gold)" }}>↑ Buy for [Next City]</span> — this is your cargo for the next leg.</li>
            <li>The dashed cargo bar shows <em>what you are carrying</em> to the next stop and the estimated profit on arrival.</li>
            <li>Travel to the next city and repeat.</li>
            <li>After the last stop, return to the starting city to <strong style={{ color: "var(--parchment)" }}>complete the loop</strong>.</li>
          </ol>
          <div style={{ marginTop: "0.75rem", padding: "0.5rem 0.75rem", background: "var(--leather-mid)", borderRadius: 3, fontSize: "0.75rem", color: "var(--text-dim)" }}>
            <strong>est.</strong> = estimated from Buy price differences (no Sell scan yet). No label = confirmed from real Sell data. City modifier emojis (⚔️📋 etc.) boost or reduce the profit — hover for details.
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function PlannerPage() {
  const { data, error, loading, refreshing, fetchedAt, refresh } = useDataFetch<ApiData>();

  const allCities = data?.cities ?? [];
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [itemTypes, setItemTypes]           = useState(5);   // different item types per leg
  const [totalSlots, setTotalSlots]         = useState(21);  // total cargo capacity

  if (allCities.length > 0 && selectedCities.length === 0) {
    setSelectedCities(allCities);
  }

  const routes = useMemo(() => {
    if (!data || selectedCities.length < 2) return [];
    return computeRoutes(
      selectedCities, data.items, data.priceMap, data.modifierMap ?? {},
      itemTypes, totalSlots
    ).slice(0, 4);
  }, [data, selectedCities, itemTypes, totalSlots]);

  if (error)   return <ErrorDisplay message={`Failed to load: ${error}`} />;
  if (loading) return <LoadingSpinner />;

  const modifierMap    = data?.modifierMap ?? {};
  const activeModifiers = Object.values(modifierMap).flat().filter(
    (m) => m.type === "economic" && m.pct > 0
  );

  function toggleCity(city: string) {
    setSelectedCities((prev) =>
      prev.includes(city) ? prev.filter((c) => c !== city) : [...prev, city]
    );
  }

  return (
    <PageWrapper
      title="Route Planner"
      subtitle="Find the most profitable full trading loop across multiple cities"
      actions={<RefreshButton fetchedAt={fetchedAt} refreshing={refreshing} onRefresh={refresh} />}
    >
      {/* Controls */}
      <div style={{ background: "var(--leather-light)", border: "1px solid var(--border)", borderRadius: 4, padding: "1.25rem 1.5rem", marginBottom: "1.25rem", display: "flex", gap: "2rem", flexWrap: "wrap", alignItems: "flex-start" }}>
        {/* City checkboxes */}
        <div style={{ flex: "1 1 auto" }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "0.85rem", color: "var(--text-dim)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.6rem" }}>Cities to Include</div>
          <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
            {allCities.map((city) => {
              const active = selectedCities.includes(city);
              const mods   = (modifierMap[city] ?? []).filter((m) => m.type === "economic" && m.pct > 0);
              return (
                <label key={city} style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer", padding: "0.3rem 0.7rem", borderRadius: 3, border: `1px solid ${active ? "var(--gold)" : "var(--border)"}`, background: active ? "rgba(201,162,74,0.08)" : "var(--leather-mid)", color: active ? "var(--gold)" : "var(--text-muted)", fontSize: "0.85rem", fontFamily: "'Cormorant Garamond', serif", transition: "all 0.15s", userSelect: "none" }}>
                  <input type="checkbox" checked={active} onChange={() => toggleCity(city)} style={{ accentColor: "var(--gold)", width: 12, height: 12 }} />
                  {city}
                  {mods.map((m, i) => <span key={i} title={m.name} style={{ fontSize: "0.75rem" }}>{m.emoji}</span>)}
                </label>
              );
            })}
          </div>
        </div>

        {/* Item types per leg */}
        <div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "0.85rem", color: "var(--text-dim)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.6rem" }}>
            Item Types / Leg
          </div>
          <div style={{ display: "flex", gap: "0.4rem" }}>
            {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
              <button key={n} onClick={() => setItemTypes(n)} style={{ background: itemTypes === n ? "var(--gold-dim)" : "var(--leather-mid)", border: `1px solid ${itemTypes === n ? "var(--gold)" : "var(--border)"}`, color: itemTypes === n ? "var(--parchment)" : "var(--text-muted)", padding: "0.3rem 0.6rem", borderRadius: 3, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.8rem" }}>
                {n}
              </button>
            ))}
          </div>
          <div style={{ fontSize: "0.68rem", color: "var(--text-dim)", marginTop: "0.3rem" }}>Different item types per leg</div>
        </div>

        {/* Total cargo slots */}
        <div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "0.85rem", color: "var(--text-dim)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.6rem" }}>
            Total Cargo Slots
          </div>
          <input
            type="number"
            min={1}
            max={999}
            value={totalSlots}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (!isNaN(v) && v > 0) setTotalSlots(v);
            }}
            style={{
              background: "var(--leather-mid)",
              border: "1px solid var(--border-gold)",
              color: "var(--parchment)",
              borderRadius: 3,
              padding: "0.3rem 0.6rem",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "1rem",
              width: 72,
              outline: "none",
              textAlign: "center",
            }}
          />
          <div style={{ fontSize: "0.68rem", color: "var(--text-dim)", marginTop: "0.3rem" }}>Total cargo capacity</div>
        </div>
      </div>

      {/* Active modifiers */}
      {activeModifiers.length > 0 && (
        <div style={{ background: "rgba(201,162,74,0.05)", border: "1px solid var(--border-gold)", borderRadius: 4, padding: "0.65rem 1.25rem", marginBottom: "1.25rem", display: "flex", flexWrap: "wrap", gap: "0.75rem 1.25rem", alignItems: "center" }}>
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "0.85rem", color: "var(--gold)" }}>Active Events:</span>
          {activeModifiers.map((m, i) => (
            <span key={i} title={m.effectText} style={{ cursor: "help", fontSize: "0.75rem", color: m.direction > 0 ? "var(--profit-light)" : "var(--loss-light)" }}>
              {m.emoji} {m.city}: {m.name} ({m.direction > 0 ? "+" : "-"}{m.pct}%)
            </span>
          ))}
        </div>
      )}

      {selectedCities.length < 2 && (
        <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-dim)", fontFamily: "'Cormorant Garamond', serif", fontSize: "1.1rem" }}>
          Select at least 2 cities to calculate routes.
        </div>
      )}

      {selectedCities.length >= 2 && routes.length === 0 && (
        <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-dim)", fontFamily: "'Cormorant Garamond', serif", fontSize: "1.1rem" }}>
          No profitable routes found with current data. More price scans needed.
        </div>
      )}

      {routes.length > 0 && (
        <>
          <QuickGuide />
          <RouteCard route={routes[0]} modifierMap={modifierMap} rank={0} />

          {routes.length > 1 && (
            <>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1rem", color: "var(--text-dim)", margin: "1.25rem 0 0.75rem", letterSpacing: "0.05em" }}>
                Alternative Routes
              </div>
              {routes.slice(1).map((route, i) => (
                <RouteCard key={i} route={route} modifierMap={modifierMap} rank={i + 1} />
              ))}
            </>
          )}
        </>
      )}

      <div style={{ marginTop: "0.75rem", fontSize: "0.7rem", color: "var(--text-dim)", fontFamily: "'Cormorant Garamond', serif" }}>
        ✦ Profits per item per leg. Confirmed = real Sell scan data. est. = estimated from Buy price difference. City modifier bonuses applied automatically.
      </div>
    </PageWrapper>
  );
}
