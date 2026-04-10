"use client";

import { useEffect, useState } from "react";
import PageWrapper from "@/components/PageWrapper";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorDisplay from "@/components/ErrorDisplay";
import type { DashboardStats, TradeOpportunity, CityFreshness } from "@/types";

interface DashboardData {
  stats: DashboardStats;
  trades: TradeOpportunity[];
  freshness: CityFreshness[];
  recentActivity: Array<{
    timestamp: string;
    city: string;
    store: string;
    mode: string;
    itemName: string;
    price: number;
    ageLabel: string;
  }>;
}

function freshnessColor(ageMinutes: number | null): string {
  if (ageMinutes === null) return "var(--text-dim)";
  if (ageMinutes < 60) return "var(--profit-light)";
  if (ageMinutes < 720) return "var(--gold)";
  return "var(--loss-light)";
}

function freshnessLabel(ageMinutes: number | null): string {
  if (ageMinutes === null) return "No data";
  if (ageMinutes < 60) return `${Math.round(ageMinutes)}m ago`;
  const hrs = ageMinutes / 60;
  if (hrs < 24) return `${hrs.toFixed(1)}h ago`;
  return `${(hrs / 24).toFixed(1)}d ago`;
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div
      style={{
        background: "var(--leather-light)",
        border: "1px solid var(--border)",
        borderTop: "2px solid var(--gold-dim)",
        borderRadius: 4,
        padding: "1.25rem 1.5rem",
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: "0.85rem",
          color: "var(--text-dim)",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          marginBottom: "0.5rem",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "1.8rem",
          color: "var(--parchment)",
          fontWeight: 500,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          style={{
            fontSize: "0.72rem",
            color: "var(--gold)",
            marginTop: "0.4rem",
            fontFamily: "'Cormorant Garamond', serif",
            letterSpacing: "0.04em",
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

export default function OverviewPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/data")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <ErrorDisplay message={`Failed to load dashboard: ${error}`} />;
  if (!data) return <LoadingSpinner />;

  const { stats, trades, freshness, recentActivity } = data;
  const top5 = trades.slice(0, 5);

  return (
    <PageWrapper
      title="Merchant's Overview"
      subtitle="Live intelligence from the trading network"
    >
      {/* Stat Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        <StatCard label="Total Scans" value={stats.totalScans.toLocaleString()} />
        <StatCard label="Items Tracked" value={stats.itemsTracked.toLocaleString()} />
        <StatCard label="Cities Mapped" value={stats.citiesMapped} />
        <StatCard
          label="Best Trade Now"
          value={stats.bestTrade ? `+${stats.bestTrade.profit.toFixed(0)}` : "—"}
          sub={
            stats.bestTrade
              ? `${stats.bestTrade.itemName}: ${stats.bestTrade.buyCity} → ${stats.bestTrade.sellCity}`
              : undefined
          }
        />
      </div>

      {/* Two-column layout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 340px",
          gap: "1.5rem",
          marginBottom: "2rem",
        }}
      >
        {/* Top 5 Trade Opportunities */}
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
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
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
              ✦ Top Trade Opportunities
            </h2>
            <a
              href="/routes"
              style={{
                fontSize: "0.75rem",
                color: "var(--text-dim)",
                textDecoration: "none",
              }}
            >
              View all →
            </a>
          </div>

          {top5.length === 0 ? (
            <div
              style={{
                padding: "2rem",
                textAlign: "center",
                color: "var(--text-dim)",
                fontFamily: "'Cormorant Garamond', serif",
              }}
            >
              No trade opportunities found yet. More scans needed.
            </div>
          ) : (
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Item</th>
                  <th>Buy In</th>
                  <th>Sell In</th>
                  <th>Buy Price</th>
                  <th>Dest. Price</th>
                  <th>Profit / Unit</th>
                </tr>
              </thead>
              <tbody>
                {top5.map((t, i) => (
                  <tr key={i} className="row-profit">
                    <td style={{ color: "var(--text-dim)" }}>{i + 1}</td>
                    <td style={{ color: "var(--parchment)", fontWeight: 500 }}>
                      {t.itemName}
                      {t.isStale && (
                        <span className="stale-badge" style={{ marginLeft: "0.4rem" }}>
                          stale
                        </span>
                      )}
                    </td>
                    <td style={{ color: "var(--text-muted)" }}>{t.buyCity}</td>
                    <td style={{ color: "var(--text-muted)" }}>{t.sellCity}</td>
                    <td className="price-num" style={{ color: "var(--parchment)" }}>
                      {t.buyPrice.toLocaleString()}
                    </td>
                    <td className="price-num" style={{ color: "var(--parchment)" }}>
                      {t.sellPrice.toLocaleString()}
                    </td>
                    <td
                      className="price-num"
                      style={{
                        color: "var(--profit-light)",
                        fontWeight: 500,
                      }}
                    >
                      +{t.profit.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* City Freshness */}
        <div
          style={{
            background: "var(--leather-light)",
            border: "1px solid var(--border)",
            borderRadius: 4,
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
              ✦ City Intelligence
            </h2>
          </div>

          <div style={{ padding: "0.75rem" }}>
            {freshness.map((f) => (
              <div
                key={f.city}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.6rem 0.5rem",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <div>
                  <a
                    href={`/cities/${f.city.toLowerCase()}`}
                    style={{
                      fontFamily: "'Cormorant Garamond', serif",
                      fontSize: "1rem",
                      color: "var(--parchment)",
                      textDecoration: "none",
                    }}
                  >
                    {f.city}
                  </a>
                  <div style={{ fontSize: "0.68rem", color: "var(--text-dim)" }}>
                    {f.scanCount.toLocaleString()} scans
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                      justifyContent: "flex-end",
                    }}
                  >
                    <span
                      className="freshness-dot"
                      style={{ background: freshnessColor(f.ageMinutes) }}
                    />
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: freshnessColor(f.ageMinutes),
                        fontFamily: "'JetBrains Mono', monospace",
                      }}
                    >
                      {freshnessLabel(f.ageMinutes)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {freshness.length === 0 && (
              <div
                style={{
                  padding: "1.5rem",
                  textAlign: "center",
                  color: "var(--text-dim)",
                  fontFamily: "'Cormorant Garamond', serif",
                }}
              >
                No city data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
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
            ✦ Recent Scans
          </h2>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="ledger-table">
            <thead>
              <tr>
                <th>Age</th>
                <th>City</th>
                <th>Store</th>
                <th>Item</th>
                <th>Mode</th>
                <th>Price</th>
              </tr>
            </thead>
            <tbody>
              {recentActivity.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      textAlign: "center",
                      color: "var(--text-dim)",
                      padding: "2rem",
                      fontFamily: "'Cormorant Garamond', serif",
                    }}
                  >
                    No recent activity
                  </td>
                </tr>
              ) : (
                recentActivity.map((row, i) => (
                  <tr key={i}>
                    <td style={{ color: "var(--text-dim)" }}>{row.ageLabel}</td>
                    <td style={{ color: "var(--text-muted)" }}>
                      <a
                        href={`/cities/${row.city.toLowerCase()}`}
                        style={{ color: "inherit", textDecoration: "none" }}
                      >
                        {row.city}
                      </a>
                    </td>
                    <td style={{ color: "var(--text-dim)" }}>{row.store}</td>
                    <td style={{ color: "var(--parchment)" }}>{row.itemName}</td>
                    <td>
                      <span
                        style={{
                          color: row.mode === "Buy" ? "var(--profit-light)" : "var(--gold)",
                          fontSize: "0.72rem",
                        }}
                      >
                        {row.mode}
                      </span>
                    </td>
                    <td
                      className="price-num"
                      style={{ color: "var(--parchment)" }}
                    >
                      {row.price.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PageWrapper>
  );
}
