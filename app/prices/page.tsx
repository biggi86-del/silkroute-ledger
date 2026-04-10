"use client";

import { useEffect, useState, useRef } from "react";
import PageWrapper from "@/components/PageWrapper";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorDisplay from "@/components/ErrorDisplay";
import type { PriceMap } from "@/types";

interface ApiData {
  cities: string[];
  items: string[];
  priceMap: PriceMap;
}

interface Tooltip {
  x: number;
  y: number;
  city: string;
  item: string;
  store: string;
  price: number;
  timestamp: string;
  mode: string;
}

function formatAge(ts: string) {
  const mins = (Date.now() - new Date(ts).getTime()) / 60_000;
  if (mins < 60) return `${Math.round(mins)}m ago`;
  const hrs = mins / 60;
  if (hrs < 24) return `${hrs.toFixed(1)}h ago`;
  return `${(hrs / 24).toFixed(1)}d ago`;
}

export default function PricesPage() {
  const [data, setData] = useState<ApiData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);
  const [modeFilter, setModeFilter] = useState<"Buy" | "Sell">("Buy");
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/data")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <ErrorDisplay message={`Failed to load: ${error}`} />;
  if (!data) return <LoadingSpinner />;

  const { cities, items, priceMap } = data;

  // For each item, find the min/max buy price city
  const cheapestCity: Record<string, string | null> = {};
  const mostExpensiveCity: Record<string, string | null> = {};

  for (const item of items) {
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    let minCity: string | null = null;
    let maxCity: string | null = null;

    for (const city of cities) {
      const entry = priceMap[item]?.[city]?.[modeFilter];
      if (entry) {
        if (entry.price < minPrice) {
          minPrice = entry.price;
          minCity = city;
        }
        if (entry.price > maxPrice) {
          maxPrice = entry.price;
          maxCity = city;
        }
      }
    }
    cheapestCity[item] = minCity;
    mostExpensiveCity[item] = maxCity;
  }

  return (
    <PageWrapper
      title="Price Grid"
      subtitle="All items × all cities — hover cells for store and timestamp details"
      actions={
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {(["Buy", "Sell"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setModeFilter(m)}
              style={{
                background:
                  modeFilter === m ? "var(--gold-dim)" : "var(--leather-mid)",
                border: `1px solid ${modeFilter === m ? "var(--gold)" : "var(--border)"}`,
                color: modeFilter === m ? "var(--parchment)" : "var(--text-muted)",
                padding: "0.3rem 0.8rem",
                borderRadius: 3,
                cursor: "pointer",
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "0.9rem",
                letterSpacing: "0.05em",
              }}
            >
              {m} Prices
            </button>
          ))}
        </div>
      }
    >
      {/* Legend */}
      <div
        style={{
          display: "flex",
          gap: "1.5rem",
          marginBottom: "1rem",
          fontSize: "0.75rem",
          color: "var(--text-dim)",
        }}
      >
        <span>
          <span
            style={{
              display: "inline-block",
              width: 10,
              height: 10,
              border: "2px solid var(--profit)",
              marginRight: 4,
            }}
          />
          Cheapest source
        </span>
        <span>
          <span
            style={{
              display: "inline-block",
              width: 10,
              height: 10,
              border: "2px solid var(--loss)",
              marginRight: 4,
            }}
          />
          Most expensive
        </span>
        <span style={{ color: "var(--text-dim)" }}>— = no data</span>
      </div>

      <div ref={tableRef} style={{ overflowX: "auto", position: "relative" }}>
        <table
          style={{
            borderCollapse: "collapse",
            width: "100%",
            fontSize: "0.8rem",
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
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  padding: "0.6rem 0.75rem",
                  borderBottom: "1px solid var(--border-gold)",
                  borderRight: "1px solid var(--border-gold)",
                  textAlign: "left",
                  whiteSpace: "nowrap",
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
                    fontSize: "0.9rem",
                    fontWeight: 600,
                    padding: "0.6rem 0.75rem",
                    borderBottom: "1px solid var(--border-gold)",
                    textAlign: "right",
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
                    background: "var(--leather-light)",
                    color: "var(--parchment)",
                    padding: "0.45rem 0.75rem",
                    borderBottom: "1px solid rgba(61,42,26,0.5)",
                    borderRight: "1px solid var(--border)",
                    fontWeight: 500,
                    whiteSpace: "nowrap",
                  }}
                >
                  {item}
                </td>
                {cities.map((city) => {
                  const entry = priceMap[item]?.[city]?.[modeFilter];
                  const isCheapest =
                    entry && cheapestCity[item] === city;
                  const isMostExpensive =
                    entry && mostExpensiveCity[item] === city;

                  // Only show border if this city is uniquely cheapest or most expensive
                  // (and there are at least 2 cities with data)
                  const citiesWithData = cities.filter(
                    (c) => priceMap[item]?.[c]?.[modeFilter]
                  );
                  const showBorder = citiesWithData.length > 1;

                  return (
                    <td
                      key={city}
                      style={{
                        padding: "0.45rem 0.75rem",
                        borderBottom: "1px solid rgba(61,42,26,0.5)",
                        textAlign: "right",
                        cursor: entry ? "pointer" : "default",
                        border:
                          showBorder && isCheapest
                            ? "2px solid var(--profit)"
                            : showBorder && isMostExpensive
                            ? "2px solid var(--loss)"
                            : undefined,
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: "0.78rem",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        if (!entry) return;
                        const rect = (
                          e.target as HTMLElement
                        ).getBoundingClientRect();
                        setTooltip({
                          x: rect.left + window.scrollX,
                          y: rect.bottom + window.scrollY + 4,
                          city,
                          item,
                          store: entry.store,
                          price: entry.price,
                          timestamp: entry.timestamp,
                          mode: modeFilter,
                        });
                      }}
                      onMouseLeave={() => setTooltip(null)}
                    >
                      {entry ? (
                        <span
                          style={{
                            color:
                              showBorder && isCheapest
                                ? "var(--profit-light)"
                                : showBorder && isMostExpensive
                                ? "var(--loss-light)"
                                : "var(--parchment)",
                          }}
                        >
                          {entry.price.toLocaleString()}
                        </span>
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
        <div
          className="tooltip-parchment"
          style={{
            position: "fixed",
            left: tooltip.x,
            top: tooltip.y,
            zIndex: 9999,
            pointerEvents: "none",
            minWidth: 200,
          }}
        >
          <div
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 600,
              fontSize: "0.9rem",
              marginBottom: "0.25rem",
              color: "var(--ink)",
            }}
          >
            {tooltip.item} — {tooltip.city}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--ink-light)" }}>
            <div>
              Store: <strong>{tooltip.store}</strong>
            </div>
            <div>
              Mode: <strong>{tooltip.mode}</strong>
            </div>
            <div>
              Price:{" "}
              <strong style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {tooltip.price.toLocaleString()}
              </strong>
            </div>
            <div>Recorded: {formatAge(tooltip.timestamp)}</div>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
