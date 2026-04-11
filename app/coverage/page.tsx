"use client";

import { useMemo } from "react";
import { PageFade } from "@/components/motion";
import PageWrapper from "@/components/PageWrapper";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorDisplay from "@/components/ErrorDisplay";
import RefreshButton from "@/components/RefreshButton";
import { useDataFetch } from "@/hooks/useDataFetch";
import type { PriceMap, TradeOpportunity } from "@/types";

interface ApiData {
  cities: string[];
  items: string[];
  priceMap: PriceMap;
  trades: TradeOpportunity[];
  fetchedAt?: string;
}

function getAgeMinutes(ts: string | undefined): number | null {
  if (!ts) return null;
  return (Date.now() - new Date(ts).getTime()) / 60_000;
}

function formatAge(mins: number | null): string {
  if (mins === null) return "—";
  if (mins < 60) return `${Math.round(mins)}m`;
  const hrs = mins / 60;
  if (hrs < 24) return `${hrs.toFixed(1)}h`;
  return `${(hrs / 24).toFixed(1)}d`;
}

function ageColor(mins: number | null): string {
  if (mins === null) return "var(--text-dim)";
  if (mins < 60) return "var(--profit-light)";
  if (mins < 360) return "var(--gold)";
  if (mins < 720) return "#B8860B";
  return "var(--loss-light)";
}

function ageBg(mins: number | null): string {
  if (mins === null) return "transparent";
  if (mins < 60) return "rgba(74,124,89,0.12)";
  if (mins < 360) return "rgba(201,162,74,0.08)";
  if (mins < 720) return "rgba(184,134,11,0.08)";
  return "rgba(139,46,46,0.1)";
}

export default function CoveragePage() {
  const { data, error, loading, refreshing, fetchedAt, refresh } = useDataFetch<ApiData>();

  const scoutOrders = useMemo(() => {
    if (!data) return [];
    const { priceMap, items, cities, trades } = data;

    // For each (item, city) combination that has no data, estimate potential profit impact
    const missing: { item: string; city: string; potentialProfit: number }[] = [];

    for (const item of items) {
      for (const city of cities) {
        const hasData =
          priceMap[item]?.[city]?.Buy || priceMap[item]?.[city]?.Sell;
        if (!hasData) {
          // Estimate impact: what's the max profit this item has in any known route?
          const maxProfit = Math.max(
            0,
            ...trades
              .filter((t) => t.itemName === item)
              .map((t) => t.profit)
          );
          missing.push({ item, city, potentialProfit: maxProfit });
        }
      }
    }

    return missing.sort((a, b) => b.potentialProfit - a.potentialProfit);
  }, [data]);

  if (error) return <ErrorDisplay message={`Failed to load: ${error}`} />;
  if (loading) return <LoadingSpinner />;
  if (!data) return null;

  const { cities, items, priceMap } = data;

  // Calculate coverage stats
  const totalSlots = items.length * cities.length;
  const filledSlots = items.reduce((acc, item) => {
    return (
      acc +
      cities.filter(
        (city) => priceMap[item]?.[city]?.Buy || priceMap[item]?.[city]?.Sell
      ).length
    );
  }, 0);
  const coveragePct = totalSlots > 0 ? ((filledSlots / totalSlots) * 100).toFixed(1) : "0";

  return (
    <PageFade>
    <PageWrapper
      title="Coverage"
      subtitle={`${coveragePct}% of item × city combinations scanned — ${filledSlots} of ${totalSlots} slots filled`}
      actions={<RefreshButton fetchedAt={fetchedAt} refreshing={refreshing} onRefresh={refresh} />}
    >
      {/* Summary Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        {[
          { label: "Coverage", value: `${coveragePct}%` },
          { label: "Slots Filled", value: filledSlots },
          { label: "Slots Empty", value: totalSlots - filledSlots },
          { label: "Cities", value: cities.length },
          { label: "Items", value: items.length },
        ].map(({ label, value }) => (
          <div
            key={label}
            style={{
              background: "var(--leather-light)",
              border: "1px solid var(--border)",
              borderTop: "2px solid var(--gold-dim)",
              borderRadius: 4,
              padding: "1rem 1.25rem",
            }}
          >
            <div
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "0.8rem",
                color: "var(--text-dim)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              {label}
            </div>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "1.5rem",
                color: "var(--parchment)",
                marginTop: "0.25rem",
              }}
            >
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Coverage Grid */}
      <div
        style={{
          background: "var(--leather-light)",
          border: "1px solid var(--border)",
          borderRadius: 4,
          overflow: "hidden",
          marginBottom: "2rem",
        }}
      >
        <div
          style={{
            padding: "0.9rem 1.25rem",
            borderBottom: "1px solid var(--border-gold)",
          }}
        >
          <h2
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "1.2rem",
              color: "var(--gold)",
              margin: 0,
            }}
          >
            ✦ Scan Freshness Grid
          </h2>
          <div
            style={{
              fontSize: "0.72rem",
              color: "var(--text-dim)",
              marginTop: "0.25rem",
            }}
          >
            Age of most recent Buy price per item × city
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              borderCollapse: "collapse",
              width: "100%",
              fontSize: "0.75rem",
            }}
          >
            <thead>
              <tr>
                <th
                  className="sticky-col-header"
                  style={{
                    background: "var(--leather-mid)",
                    color: "var(--gold)",
                    fontFamily: "'Cormorant Garamond', serif",
                    fontWeight: 600,
                    padding: "0.6rem 0.75rem",
                    borderBottom: "1px solid var(--border-gold)",
                    borderRight: "1px solid var(--border-gold)",
                    textAlign: "left",
                    minWidth: 180,
                  }}
                >
                  Item
                </th>
                {cities.map((city) => (
                  <th
                    key={city}
                    style={{
                      background: "var(--leather-mid)",
                      color: "var(--gold)",
                      fontFamily: "'Cormorant Garamond', serif",
                      fontWeight: 600,
                      padding: "0.6rem 0.75rem",
                      borderBottom: "1px solid var(--border-gold)",
                      textAlign: "center",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {city}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item}>
                  <td
                    className="sticky-col"
                    style={{
                      padding: "0.4rem 0.75rem",
                      borderBottom: "1px solid rgba(61,42,26,0.5)",
                      borderRight: "1px solid var(--border)",
                      color: "var(--parchment)",
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: "0.75rem",
                    }}
                  >
                    {item}
                  </td>
                  {cities.map((city) => {
                    const buyEntry = priceMap[item]?.[city]?.Buy;
                    const ts = buyEntry?.timestamp;
                    const mins = getAgeMinutes(ts);

                    return (
                      <td
                        key={city}
                        title={ts ? `Last scan: ${new Date(ts).toLocaleString()}` : "No data"}
                        style={{
                          padding: "0.4rem 0.5rem",
                          borderBottom: "1px solid rgba(61,42,26,0.5)",
                          textAlign: "center",
                          background: ageBg(mins),
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: "0.7rem",
                          color: ageColor(mins),
                        }}
                      >
                        {formatAge(mins)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Scout Orders */}
      <div
        style={{
          background: "var(--leather-light)",
          border: "1px solid var(--border)",
          borderRadius: 4,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "0.9rem 1.25rem",
            borderBottom: "1px solid var(--border-gold)",
          }}
        >
          <h2
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "1.2rem",
              color: "var(--gold)",
              margin: 0,
            }}
          >
            ✦ Scout Orders
          </h2>
          <div
            style={{
              fontSize: "0.72rem",
              color: "var(--text-dim)",
              marginTop: "0.25rem",
            }}
          >
            Unsurveyed slots, prioritised by potential profit impact
          </div>
        </div>
        <table className="ledger-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Item</th>
              <th>City to Scout</th>
              <th>Est. Profit Impact</th>
            </tr>
          </thead>
          <tbody>
            {scoutOrders.slice(0, 20).length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  style={{
                    textAlign: "center",
                    color: "var(--profit-light)",
                    padding: "1.5rem",
                    fontFamily: "'Cormorant Garamond', serif",
                  }}
                >
                  ✓ Full coverage achieved — all item × city combinations scanned
                </td>
              </tr>
            ) : (
              scoutOrders.slice(0, 20).map((order, i) => (
                <tr key={i}>
                  <td style={{ color: "var(--text-dim)" }}>{i + 1}</td>
                  <td style={{ color: "var(--parchment)", fontWeight: 500 }}>
                    {order.item}
                  </td>
                  <td style={{ color: "var(--text-muted)" }}>
                    <a
                      href={`/cities/${order.city.toLowerCase()}`}
                      style={{ color: "inherit", textDecoration: "none" }}
                    >
                      {order.city}
                    </a>
                  </td>
                  <td
                    className="price-num"
                    style={{
                      color:
                        order.potentialProfit > 0
                          ? "var(--gold)"
                          : "var(--text-dim)",
                    }}
                  >
                    {order.potentialProfit > 0
                      ? `+${order.potentialProfit.toLocaleString()}`
                      : "Unknown"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div
        style={{
          marginTop: "1rem",
          display: "flex",
          gap: "1.5rem",
          flexWrap: "wrap",
          fontSize: "0.72rem",
        }}
      >
        {[
          { color: "rgba(74,124,89,0.4)", label: "Fresh (< 1h)" },
          { color: "rgba(201,162,74,0.4)", label: "Recent (1–6h)" },
          { color: "rgba(184,134,11,0.3)", label: "Aging (6–12h)" },
          { color: "rgba(139,46,46,0.3)", label: "Stale (> 12h)" },
          { color: "transparent", label: "— = No data", border: "1px solid var(--border)" },
        ].map(({ color, label, border }) => (
          <span
            key={label}
            style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--text-dim)" }}
          >
            <span
              style={{
                display: "inline-block",
                width: 14,
                height: 14,
                background: color,
                border: border ?? "none",
                borderRadius: 2,
              }}
            />
            {label}
          </span>
        ))}
      </div>
    </PageWrapper>
    </PageFade>
  );
}
