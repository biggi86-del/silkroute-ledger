"use client";

import { useEffect, useState, useMemo } from "react";
import PageWrapper from "@/components/PageWrapper";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorDisplay from "@/components/ErrorDisplay";
import type { TradeOpportunity } from "@/types";

type SortKey = "profit" | "buyCity" | "sellCity" | "itemName" | "buyPrice" | "sellPrice";
type SortDir = "asc" | "desc";

export default function RoutesPage() {
  const [trades, setTrades] = useState<TradeOpportunity[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [filterCity, setFilterCity] = useState<string>("all");
  const [filterItem, setFilterItem] = useState<string>("");
  const [hideStale, setHideStale] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("profit");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  useEffect(() => {
    fetch("/api/data")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => {
        setTrades(d.trades ?? []);
        setCities(d.cities ?? []);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  const items = useMemo(
    () => Array.from(new Set(trades.map((t) => t.itemName))).sort(),
    [trades]
  );

  const filtered = useMemo(() => {
    let list = [...trades];
    if (filterCity !== "all") {
      list = list.filter(
        (t) => t.buyCity === filterCity || t.sellCity === filterCity
      );
    }
    if (filterItem) {
      list = list.filter((t) =>
        t.itemName.toLowerCase().includes(filterItem.toLowerCase())
      );
    }
    if (hideStale) {
      list = list.filter((t) => !t.isStale);
    }
    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "profit") cmp = a.profit - b.profit;
      else if (sortKey === "buyPrice") cmp = a.buyPrice - b.buyPrice;
      else if (sortKey === "sellPrice") cmp = a.sellPrice - b.sellPrice;
      else cmp = String(a[sortKey]).localeCompare(String(b[sortKey]));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [trades, filterCity, filterItem, hideStale, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (k !== sortKey) return <span style={{ opacity: 0.3 }}> ⇅</span>;
    return <span style={{ color: "var(--gold)" }}>{sortDir === "asc" ? " ↑" : " ↓"}</span>;
  }

  function formatAge(ts: string) {
    const mins = (Date.now() - new Date(ts).getTime()) / 60_000;
    if (mins < 60) return `${Math.round(mins)}m`;
    const hrs = mins / 60;
    return `${hrs.toFixed(1)}h`;
  }

  if (error) return <ErrorDisplay message={`Failed to load: ${error}`} />;
  if (loading) return <LoadingSpinner />;

  return (
    <PageWrapper
      title="Trade Routes"
      subtitle={`${filtered.length} profitable routes discovered across ${cities.length} cities`}
    >
      {/* Filters */}
      <div
        style={{
          display: "flex",
          gap: "1rem",
          flexWrap: "wrap",
          marginBottom: "1.5rem",
          alignItems: "center",
        }}
      >
        <div>
          <label
            style={{
              display: "block",
              fontSize: "0.72rem",
              color: "var(--text-dim)",
              letterSpacing: "0.08em",
              marginBottom: "0.3rem",
              fontFamily: "'Cormorant Garamond', serif",
              textTransform: "uppercase",
            }}
          >
            Filter by City
          </label>
          <select
            className="ledger-select"
            value={filterCity}
            onChange={(e) => setFilterCity(e.target.value)}
          >
            <option value="all">All Cities</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            style={{
              display: "block",
              fontSize: "0.72rem",
              color: "var(--text-dim)",
              letterSpacing: "0.08em",
              marginBottom: "0.3rem",
              fontFamily: "'Cormorant Garamond', serif",
              textTransform: "uppercase",
            }}
          >
            Search Item
          </label>
          <input
            className="ledger-input"
            placeholder="e.g. Iron Ingot"
            value={filterItem}
            onChange={(e) => setFilterItem(e.target.value)}
            style={{ minWidth: 160 }}
          />
        </div>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            cursor: "pointer",
            fontSize: "0.8rem",
            color: "var(--text-muted)",
            marginTop: "1.2rem",
          }}
        >
          <input
            type="checkbox"
            checked={hideStale}
            onChange={(e) => setHideStale(e.target.checked)}
            style={{ accentColor: "var(--gold)" }}
          />
          Hide stale data (&gt;12h)
        </label>

        <div style={{ marginTop: "1.2rem", fontSize: "0.72rem", color: "var(--text-dim)" }}>
          Showing {filtered.length} of {trades.length} routes
        </div>
      </div>

      {/* Table */}
      <div
        style={{
          background: "var(--leather-light)",
          border: "1px solid var(--border)",
          borderRadius: 4,
          overflow: "hidden",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table className="ledger-table">
            <thead>
              <tr>
                <th
                  style={{ cursor: "pointer" }}
                  onClick={() => handleSort("itemName")}
                >
                  Item <SortIcon k="itemName" />
                </th>
                <th
                  style={{ cursor: "pointer" }}
                  onClick={() => handleSort("buyCity")}
                >
                  Buy In <SortIcon k="buyCity" />
                </th>
                <th
                  style={{ cursor: "pointer" }}
                  onClick={() => handleSort("sellCity")}
                >
                  Sell In <SortIcon k="sellCity" />
                </th>
                <th
                  style={{ cursor: "pointer" }}
                  onClick={() => handleSort("buyPrice")}
                >
                  Buy Price <SortIcon k="buyPrice" />
                </th>
                <th
                  style={{ cursor: "pointer" }}
                  onClick={() => handleSort("sellPrice")}
                >
                  Dest. Price <SortIcon k="sellPrice" />
                </th>
                <th
                  style={{ cursor: "pointer" }}
                  onClick={() => handleSort("profit")}
                >
                  Profit / Unit <SortIcon k="profit" />
                </th>
                <th>Data Age</th>
                <th>Status</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    style={{
                      textAlign: "center",
                      color: "var(--text-dim)",
                      padding: "2rem",
                      fontFamily: "'Cormorant Garamond', serif",
                    }}
                  >
                    No routes found matching your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((t, i) => (
                  <tr key={i} style={t.isLocalSell ? { opacity: 0.78 } : undefined}>
                    <td style={{ color: "var(--parchment)", fontWeight: 500 }}>
                      {t.itemName}
                    </td>
                    <td style={{ color: "var(--text-muted)" }}>
                      <a
                        href={`/cities/${t.buyCity.toLowerCase()}`}
                        style={{ color: "inherit", textDecoration: "none" }}
                      >
                        {t.buyCity}
                      </a>
                    </td>
                    <td style={{ color: "var(--text-muted)" }}>
                      <a
                        href={`/cities/${t.sellCity.toLowerCase()}`}
                        style={{ color: "inherit", textDecoration: "none" }}
                      >
                        {t.sellCity}
                      </a>
                    </td>
                    <td className="price-num">{t.buyPrice.toLocaleString()}</td>
                    <td className="price-num">{t.sellPrice.toLocaleString()}</td>
                    <td
                      className="price-num"
                      style={{ color: "var(--profit-light)", fontWeight: 600 }}
                    >
                      +{t.profit.toLocaleString()}
                    </td>
                    <td
                      style={{
                        color: t.isStale ? "var(--loss-light)" : "var(--text-dim)",
                        fontSize: "0.72rem",
                      }}
                    >
                      {formatAge(t.buyTimestamp)} / {formatAge(t.sellTimestamp)}
                    </td>
                    <td>
                      {t.isStale ? (
                        <span className="stale-badge">⚠ stale</span>
                      ) : (
                        <span
                          style={{
                            fontSize: "0.72rem",
                            color: "var(--profit-light)",
                          }}
                        >
                          ✓ fresh
                        </span>
                      )}
                    </td>
                    <td>
                      {t.isLocalSell && (
                        <span
                          title="Locally produced in destination — actual sell price will be lower than estimated"
                          style={{
                            cursor: "help",
                            fontSize: "0.82rem",
                            color: "var(--gold)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          ⚠️ <span style={{ fontSize: "0.68rem", color: "var(--text-dim)" }}>local produce</span>
                        </span>
                      )}
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
