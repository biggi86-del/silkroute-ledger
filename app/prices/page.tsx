"use client";

import { useState, useRef } from "react";
import PageWrapper from "@/components/PageWrapper";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorDisplay from "@/components/ErrorDisplay";
import RefreshButton from "@/components/RefreshButton";
import { useDataFetch } from "@/hooks/useDataFetch";
import type { PriceMap } from "@/types";

interface ApiData {
  cities: string[];
  items: string[];
  priceMap: PriceMap;
  modeCounts?: { buy: number; sell: number };
  fetchedAt?: string;
}

interface TooltipData {
  x: number;
  y: number;
  city: string;
  item: string;
  buyEntry:  { store: string; price: number; timestamp: string; local: boolean } | null;
  sellEntry: { store: string; price: number; timestamp: string } | null;
}

function formatAge(ts: string) {
  const mins = Math.abs((Date.now() - new Date(ts).getTime()) / 60_000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${Math.round(mins)}m ago`;
  const hrs = mins / 60;
  if (hrs < 24) return `${hrs.toFixed(1)}h ago`;
  return `${(hrs / 24).toFixed(1)}d ago`;
}

export default function PricesPage() {
  const { data, error, loading, refreshing, fetchedAt, refresh } = useDataFetch<ApiData>();
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  if (error) return <ErrorDisplay message={`Failed to load: ${error}`} />;
  if (loading) return <LoadingSpinner />;
  if (!data) return null;

  const { cities, items, priceMap, modeCounts } = data;

  // Cheapest / priciest Buy city per item
  const cheapestBuyCity: Record<string, string | null> = {};
  const priciesBuyCity:  Record<string, string | null> = {};
  for (const item of items) {
    let min = Infinity, max = -Infinity;
    let minCity: string | null = null, maxCity: string | null = null;
    for (const city of cities) {
      const p = priceMap[item]?.[city]?.Buy?.price;
      if (p !== undefined) {
        if (p < min) { min = p; minCity = city; }
        if (p > max) { max = p; maxCity = city; }
      }
    }
    cheapestBuyCity[item] = minCity;
    priciesBuyCity[item]  = maxCity;
  }

  return (
    <PageWrapper
      title="Price Grid"
      subtitle="Buy (green) and Sell (amber) prices per item × city — hover cells for details"
      actions={<RefreshButton fetchedAt={fetchedAt} refreshing={refreshing} onRefresh={refresh} />}
    >
      {/* Legend */}
      <div style={{ display: "flex", gap: "1.5rem", marginBottom: "1rem", flexWrap: "wrap", alignItems: "center" }}>
        {[
          { bg: "rgba(74,124,89,0.5)", border: "var(--profit)", label: "Buy price" },
          { bg: "rgba(201,162,74,0.2)", border: "var(--gold-dim)", label: "Sell price" },
          { bg: "transparent", border: "var(--profit)", label: "Cheapest buy" },
          { bg: "transparent", border: "var(--loss)",   label: "Priciest buy" },
        ].map(({ bg, border, label }) => (
          <span key={label} style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.75rem", color: "var(--text-dim)" }}>
            <span style={{ display: "inline-block", width: 10, height: 10, background: bg, border: `2px solid ${border}`, borderRadius: 1 }} />
            {label}
          </span>
        ))}
        {modeCounts && (
          <span style={{ marginLeft: "auto", fontSize: "0.72rem", color: "var(--text-dim)", fontFamily: "'JetBrains Mono', monospace" }}>
            {modeCounts.buy} Buy · {modeCounts.sell} Sell entries
          </span>
        )}
      </div>

      <div ref={tableRef} style={{ overflowX: "auto", position: "relative" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "0.78rem" }}>
          <thead>
            <tr>
              <th className="sticky-col-header" style={{ background: "var(--leather-mid)", color: "var(--gold)", fontFamily: "'Cormorant Garamond', serif", fontSize: "0.9rem", fontWeight: 600, padding: "0.6rem 0.75rem", borderBottom: "1px solid var(--border-gold)", borderRight: "1px solid var(--border-gold)", textAlign: "left", whiteSpace: "nowrap", minWidth: 180 }}>
                Item
              </th>
              {cities.map((city) => (
                <th key={city} style={{ background: "var(--leather-mid)", color: "var(--gold)", fontFamily: "'Cormorant Garamond', serif", fontSize: "0.9rem", fontWeight: 600, padding: "0.6rem 0.75rem", borderBottom: "1px solid var(--border-gold)", textAlign: "right", whiteSpace: "nowrap" }}>
                  {city}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item}>
                <td className="sticky-col" style={{ background: "var(--leather-light)", color: "var(--parchment)", padding: "0.35rem 0.75rem", borderBottom: "1px solid rgba(61,42,26,0.5)", borderRight: "1px solid var(--border)", fontWeight: 500, whiteSpace: "nowrap" }}>
                  {item}
                </td>
                {cities.map((city) => {
                  const buyEntry  = priceMap[item]?.[city]?.Buy  ?? null;
                  const sellEntry = priceMap[item]?.[city]?.Sell ?? null;
                  const isCheapest = buyEntry && cheapestBuyCity[item] === city;
                  const isPriciest  = buyEntry && priciesBuyCity[item]  === city;
                  const citiesWithBuy = cities.filter((c) => priceMap[item]?.[c]?.Buy).length;
                  const showBorder  = citiesWithBuy > 1;
                  const hasAny = buyEntry || sellEntry;

                  return (
                    <td key={city}
                      style={{
                        padding: "0.3rem 0.75rem",
                        borderBottom: "1px solid rgba(61,42,26,0.5)",
                        textAlign: "right",
                        cursor: hasAny ? "pointer" : "default",
                        outline: showBorder && isCheapest ? "2px solid var(--profit)" : showBorder && isPriciest ? "2px solid var(--loss)" : undefined,
                        outlineOffset: "-2px",
                        verticalAlign: "middle",
                      }}
                      onMouseEnter={(e) => {
                        if (!hasAny) return;
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        setTooltip({
                          x: rect.left + window.scrollX,
                          y: rect.bottom + window.scrollY + 4,
                          city, item,
                          buyEntry:  buyEntry  ? { store: buyEntry.store,  price: buyEntry.price,  timestamp: buyEntry.timestamp,  local: buyEntry.local ?? false } : null,
                          sellEntry: sellEntry ? { store: sellEntry.store, price: sellEntry.price, timestamp: sellEntry.timestamp } : null,
                        });
                      }}
                      onMouseLeave={() => setTooltip(null)}
                    >
                      {hasAny ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.1rem", alignItems: "flex-end" }}>
                          {buyEntry ? (
                            <span style={{ color: showBorder && isCheapest ? "var(--profit-light)" : showBorder && isPriciest ? "var(--loss-light)" : "var(--parchment)", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.78rem", display: "flex", alignItems: "center", gap: "0.2rem" }}>
                              <span style={{ fontSize: "0.6rem", color: "var(--profit)", opacity: 0.8 }}>B</span>
                              {buyEntry.price.toLocaleString()}
                              {buyEntry.local && <span title="Locally produced" style={{ fontSize: "0.65rem" }}>🪙</span>}
                            </span>
                          ) : (
                            <span style={{ color: "var(--text-dim)", fontSize: "0.72rem" }}>B —</span>
                          )}
                          {sellEntry ? (
                            <span style={{ color: "var(--gold)", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.78rem", display: "flex", alignItems: "center", gap: "0.2rem" }}>
                              <span style={{ fontSize: "0.6rem", color: "var(--gold-dim)", opacity: 0.8 }}>S</span>
                              {sellEntry.price.toLocaleString()}
                            </span>
                          ) : (
                            <span style={{ color: "var(--text-dim)", fontSize: "0.72rem" }}>S —</span>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: "var(--text-dim)" }}>—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div className="tooltip-parchment" style={{ position: "fixed", left: tooltip.x, top: tooltip.y, zIndex: 9999, pointerEvents: "none", minWidth: 210 }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "0.95rem", marginBottom: "0.4rem", color: "var(--ink)", borderBottom: "1px solid var(--parchment-dark)", paddingBottom: "0.3rem" }}>
            {tooltip.item} — {tooltip.city}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--ink-light)" }}>
            {tooltip.buyEntry ? (
              <div style={{ marginBottom: "0.3rem" }}>
                <div style={{ color: "var(--profit)", fontWeight: 600, fontSize: "0.7rem", letterSpacing: "0.05em" }}>BUY</div>
                <div>Store: <strong>{tooltip.buyEntry.store}</strong></div>
                <div>Price: <strong style={{ fontFamily: "'JetBrains Mono', monospace" }}>{tooltip.buyEntry.price.toLocaleString()}</strong></div>
                <div>Recorded: {formatAge(tooltip.buyEntry.timestamp)}</div>
                {tooltip.buyEntry.local && <div style={{ color: "var(--gold-dim)", fontStyle: "italic" }}>🪙 Locally produced</div>}
              </div>
            ) : <div style={{ color: "var(--text-dim)", marginBottom: "0.3rem" }}>No buy data</div>}
            {tooltip.sellEntry ? (
              <div style={{ borderTop: "1px solid rgba(201,162,74,0.2)", paddingTop: "0.3rem" }}>
                <div style={{ color: "var(--gold)", fontWeight: 600, fontSize: "0.7rem", letterSpacing: "0.05em" }}>SELL</div>
                <div>Store: <strong>{tooltip.sellEntry.store}</strong></div>
                <div>Price: <strong style={{ fontFamily: "'JetBrains Mono', monospace" }}>{tooltip.sellEntry.price.toLocaleString()}</strong></div>
                <div>Recorded: {formatAge(tooltip.sellEntry.timestamp)}</div>
              </div>
            ) : <div style={{ color: "var(--text-dim)", borderTop: "1px solid rgba(201,162,74,0.2)", paddingTop: "0.3rem" }}>No sell data</div>}
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
