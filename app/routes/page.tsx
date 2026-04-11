"use client";

import { useMemo, useState } from "react";
import PageWrapper from "@/components/PageWrapper";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorDisplay from "@/components/ErrorDisplay";
import RefreshButton from "@/components/RefreshButton";
import { useDataFetch } from "@/hooks/useDataFetch";
import type { TradeOpportunity } from "@/types";

type SortKey = "adjustedProfit" | "profit" | "buyCity" | "sellCity" | "itemName" | "buyPrice" | "sellPrice";
type SortDir = "asc" | "desc";

interface ApiData {
  trades: TradeOpportunity[];
  cities: string[];
  fetchedAt?: string;
}

function formatAge(ts: string) {
  const mins = Math.abs((Date.now() - new Date(ts).getTime()) / 60_000);
  if (mins < 2) return "now";
  if (mins < 60) return `${Math.round(mins)}m`;
  const hrs = mins / 60;
  return `${hrs.toFixed(1)}h`;
}

export default function RoutesPage() {
  const { data, error, loading, refreshing, fetchedAt, refresh } = useDataFetch<ApiData>();

  const [filterCity, setFilterCity] = useState("all");
  const [filterItem, setFilterItem] = useState("");
  const [hideStale, setHideStale] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("adjustedProfit");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const trades = data?.trades ?? [];
  const cities = data?.cities ?? [];

  const items = useMemo(() => Array.from(new Set(trades.map((t) => t.itemName))).sort(), [trades]);

  const filtered = useMemo(() => {
    let list = [...trades];
    if (filterCity !== "all") list = list.filter((t) => t.buyCity === filterCity || t.sellCity === filterCity);
    if (filterItem) list = list.filter((t) => t.itemName.toLowerCase().includes(filterItem.toLowerCase()));
    if (hideStale) list = list.filter((t) => !t.isStale);
    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "adjustedProfit") cmp = (a.adjustedProfit ?? a.profit) - (b.adjustedProfit ?? b.profit);
      else if (sortKey === "profit")    cmp = a.profit - b.profit;
      else if (sortKey === "buyPrice")  cmp = a.buyPrice - b.buyPrice;
      else if (sortKey === "sellPrice") cmp = a.sellPrice - b.sellPrice;
      else cmp = String(a[sortKey as keyof TradeOpportunity]).localeCompare(String(b[sortKey as keyof TradeOpportunity]));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [trades, filterCity, filterItem, hideStale, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (k !== sortKey) return <span style={{ opacity: 0.3 }}> ⇅</span>;
    return <span style={{ color: "var(--gold)" }}>{sortDir === "asc" ? " ↑" : " ↓"}</span>;
  }

  if (error) return <ErrorDisplay message={`Failed to load: ${error}`} />;
  if (loading) return <LoadingSpinner />;

  return (
    <PageWrapper
      title="Trade Routes"
      subtitle={`${filtered.length} profitable routes across ${cities.length} cities`}
      actions={<RefreshButton fetchedAt={fetchedAt} refreshing={refreshing} onRefresh={refresh} />}
    >
      {/* Filters */}
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1.5rem", alignItems: "center" }}>
        <div>
          <label style={{ display: "block", fontSize: "0.72rem", color: "var(--text-dim)", letterSpacing: "0.08em", marginBottom: "0.3rem", fontFamily: "'Cormorant Garamond', serif", textTransform: "uppercase" }}>City</label>
          <select className="ledger-select" value={filterCity} onChange={(e) => setFilterCity(e.target.value)}>
            <option value="all">All Cities</option>
            {cities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: "block", fontSize: "0.72rem", color: "var(--text-dim)", letterSpacing: "0.08em", marginBottom: "0.3rem", fontFamily: "'Cormorant Garamond', serif", textTransform: "uppercase" }}>Item</label>
          <input className="ledger-input" placeholder="Search item…" value={filterItem} onChange={(e) => setFilterItem(e.target.value)} style={{ minWidth: 150 }} />
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "1.2rem" }}>
          <input type="checkbox" checked={hideStale} onChange={(e) => setHideStale(e.target.checked)} style={{ accentColor: "var(--gold)" }} />
          Hide stale (&gt;12h)
        </label>
        <div style={{ marginTop: "1.2rem", fontSize: "0.72rem", color: "var(--text-dim)" }}>{filtered.length} / {trades.length} routes</div>
      </div>

      <div style={{ background: "var(--leather-light)", border: "1px solid var(--border)", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="ledger-table">
            <thead>
              <tr>
                <th style={{ cursor: "pointer" }} onClick={() => handleSort("itemName")}>Item <SortIcon k="itemName" /></th>
                <th style={{ cursor: "pointer" }} onClick={() => handleSort("buyCity")}>Buy In <SortIcon k="buyCity" /></th>
                <th style={{ cursor: "pointer" }} onClick={() => handleSort("sellCity")}>Sell In <SortIcon k="sellCity" /></th>
                <th style={{ cursor: "pointer" }} onClick={() => handleSort("buyPrice")}>Buy Price <SortIcon k="buyPrice" /></th>
                <th style={{ cursor: "pointer" }} onClick={() => handleSort("sellPrice")}>Sell Price <SortIcon k="sellPrice" /></th>
                <th style={{ cursor: "pointer" }} onClick={() => handleSort("profit")}>Base Profit <SortIcon k="profit" /></th>
                <th style={{ cursor: "pointer" }} onClick={() => handleSort("adjustedProfit")}>Adj. Profit <SortIcon k="adjustedProfit" /></th>
                <th>Modifier</th>
                <th>Type</th>
                <th>Age</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={11} style={{ textAlign: "center", color: "var(--text-dim)", padding: "2rem", fontFamily: "'Cormorant Garamond', serif" }}>No routes found.</td></tr>
              ) : filtered.map((t, i) => {
                const adj = t.adjustedProfit ?? t.profit;
                const hasBonus = t.modifierLabel && t.modifierBonus !== 0;
                return (
                  <tr key={i} style={t.isLocalSell ? { opacity: 0.78 } : undefined}>
                    <td style={{ color: "var(--parchment)", fontWeight: 500 }}>{t.itemName}</td>
                    <td style={{ color: "var(--text-muted)" }}><a href={`/cities/${t.buyCity.toLowerCase()}`} style={{ color: "inherit", textDecoration: "none" }}>{t.buyCity}</a></td>
                    <td style={{ color: "var(--text-muted)" }}><a href={`/cities/${t.sellCity.toLowerCase()}`} style={{ color: "inherit", textDecoration: "none" }}>{t.sellCity}</a></td>
                    <td className="price-num">{t.buyPrice.toLocaleString()}</td>
                    <td className="price-num" style={{ color: t.profitConfirmed ? "var(--gold)" : undefined }}>{t.sellPrice.toLocaleString()}</td>
                    <td className="price-num" style={{ color: "var(--profit-light)" }}>+{t.profit.toLocaleString()}</td>
                    <td className="price-num" style={{ color: hasBonus ? "var(--gold)" : "var(--profit-light)", fontWeight: 600 }}>
                      +{adj.toLocaleString()}
                      {hasBonus && <span style={{ fontSize: "0.6rem", marginLeft: 2 }}>↑</span>}
                    </td>
                    <td>
                      {t.modifierLabel ? (
                        <span title={t.modifierLabel} style={{ cursor: "help", fontSize: "0.85rem" }}>
                          {t.modifierLabel.split(" ")[0]}
                          <span style={{ fontSize: "0.65rem", color: t.modifierBonus > 0 ? "var(--profit-light)" : "var(--loss-light)", marginLeft: "0.2rem" }}>
                            {t.modifierBonus > 0 ? `+${Math.round(t.modifierBonus * 100)}%` : `${Math.round(t.modifierBonus * 100)}%`}
                          </span>
                        </span>
                      ) : <span style={{ color: "var(--text-dim)", fontSize: "0.72rem" }}>—</span>}
                    </td>
                    <td>
                      {t.profitConfirmed
                        ? <span style={{ fontSize: "0.7rem", color: "var(--profit-light)", whiteSpace: "nowrap" }}>✓ confirmed</span>
                        : <span style={{ fontSize: "0.7rem", color: "var(--text-dim)", whiteSpace: "nowrap" }}>~ estimated</span>}
                    </td>
                    <td style={{ color: t.isStale ? "var(--loss-light)" : "var(--text-dim)", fontSize: "0.72rem" }}>
                      {formatAge(t.buyTimestamp)} / {formatAge(t.sellTimestamp)}
                    </td>
                    <td>
                      {t.isStale
                        ? <span className="stale-badge">⚠ stale</span>
                        : <span style={{ fontSize: "0.72rem", color: "var(--profit-light)" }}>✓ fresh</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </PageWrapper>
  );
}
