"use client";

import { useMemo, useState } from "react";
import { PageFade } from "@/components/motion";
import PageWrapper from "@/components/PageWrapper";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorDisplay from "@/components/ErrorDisplay";
import RefreshButton from "@/components/RefreshButton";
import { useDataFetch } from "@/hooks/useDataFetch";
import { getModifierBonus } from "@/lib/modifiers-client";
import type { PriceMap, ModifierMap } from "@/types";

interface ApiData {
  cities: string[];
  items: string[];
  priceMap: PriceMap;
  modifierMap: ModifierMap;
  fetchedAt?: string;
}

export default function CalculatorPage() {
  const { data, error, loading, refreshing, fetchedAt, refresh } = useDataFetch<ApiData>();
  const [buyCity, setBuyCity] = useState("");
  const [sellCity, setSellCity] = useState("");

  // Set defaults once data loads
  if (data && !buyCity && data.cities.length >= 2) {
    setBuyCity(data.cities[0]);
    setSellCity(data.cities[1]);
  }

  const rows = useMemo(() => {
    if (!data || !buyCity || !sellCity) return [];
    const { priceMap, modifierMap, items } = data;
    return items
      .map((item) => {
        const buyEntry        = priceMap[item]?.[buyCity]?.Buy   ?? null;
        const destBuyEntry    = priceMap[item]?.[sellCity]?.Buy  ?? null;
        const actualSellEntry = priceMap[item]?.[sellCity]?.Sell ?? null;

        const buyPrice        = buyEntry?.price ?? null;
        const destBuyPrice    = destBuyEntry?.price ?? null;
        const actualSellPrice = actualSellEntry?.price ?? null;
        const effectiveSell   = actualSellPrice ?? destBuyPrice;
        const baseProfit      = buyPrice !== null && effectiveSell !== null ? effectiveSell - buyPrice : null;

        const { bonus, label: modLabel } = getModifierBonus(item, sellCity, modifierMap);
        const adjustedProfit  = baseProfit !== null ? Math.round(baseProfit * (1 + bonus)) : null;
        const profitConfirmed = actualSellPrice !== null;
        const isLocalSell     = (actualSellEntry ?? destBuyEntry)?.local === true;

        return { item, buyPrice, destBuyPrice, actualSellPrice, effectiveSell, baseProfit, adjustedProfit, profitConfirmed, isLocalSell, modLabel, bonus };
      })
      .filter((r) => r.buyPrice !== null || r.destBuyPrice !== null || r.actualSellPrice !== null)
      .sort((a, b) => {
        if (a.adjustedProfit === null && b.adjustedProfit === null) return 0;
        if (a.adjustedProfit === null) return 1;
        if (b.adjustedProfit === null) return -1;
        if (a.profitConfirmed !== b.profitConfirmed) return a.profitConfirmed ? -1 : 1;
        if (a.isLocalSell !== b.isLocalSell) return a.isLocalSell ? 1 : -1;
        return b.adjustedProfit - a.adjustedProfit;
      });
  }, [data, buyCity, sellCity]);

  const bestTrade = useMemo(() => rows.find((r) => (r.adjustedProfit ?? 0) > 0 && !r.isLocalSell) ?? null, [rows]);

  if (error) return <ErrorDisplay message={`Failed to load: ${error}`} />;
  if (loading) return <LoadingSpinner />;
  if (!data) return null;

  const { cities } = data;

  return (
    <PageFade>
    <PageWrapper
      title="Trade Calculator"
      subtitle="Compare prices between cities — confirmed sell data preferred over estimates"
      actions={<RefreshButton fetchedAt={fetchedAt} refreshing={refreshing} onRefresh={refresh} />}
    >
      {/* City selectors */}
      <div style={{ display: "flex", gap: "1.5rem", alignItems: "flex-end", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <div>
          <label style={{ display: "block", fontFamily: "'Cormorant Garamond', serif", fontSize: "0.85rem", color: "var(--text-dim)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.4rem" }}>Buy City</label>
          <select className="ledger-select" value={buyCity} onChange={(e) => setBuyCity(e.target.value)} style={{ minWidth: 160 }}>
            {cities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div style={{ fontSize: "1.5rem", color: "var(--gold-dim)", paddingBottom: "0.15rem" }}>→</div>
        <div>
          <label style={{ display: "block", fontFamily: "'Cormorant Garamond', serif", fontSize: "0.85rem", color: "var(--text-dim)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.4rem" }}>Sell City</label>
          <select className="ledger-select" value={sellCity} onChange={(e) => setSellCity(e.target.value)} style={{ minWidth: 160 }}>
            {cities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        {buyCity === sellCity && <div style={{ fontSize: "0.8rem", color: "var(--loss-light)", paddingBottom: "0.2rem" }}>⚠ Select different cities</div>}
      </div>

      {/* Best trade card */}
      {bestTrade && buyCity !== sellCity && (
        <div style={{ background: "rgba(74,124,89,0.1)", border: "1px solid rgba(74,124,89,0.35)", borderRadius: 4, padding: "1rem 1.5rem", marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "0.8rem", color: "var(--text-dim)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.25rem" }}>
              Best Trade on this Route
              {bestTrade.profitConfirmed && <span style={{ marginLeft: "0.5rem", background: "rgba(74,124,89,0.2)", border: "1px solid rgba(74,124,89,0.4)", color: "var(--profit-light)", padding: "0.1rem 0.4rem", borderRadius: 2, fontSize: "0.65rem" }}>✓ CONFIRMED</span>}
              {bestTrade.modLabel && <span style={{ marginLeft: "0.4rem", fontSize: "0.75rem" }} title={bestTrade.modLabel}>{bestTrade.modLabel.split(" ")[0]}</span>}
            </div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.3rem", color: "var(--parchment)" }}>{bestTrade.item}</div>
          </div>
          <div style={{ display: "flex", gap: "2rem" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>BUY @ {buyCity}</div>
              <div className="price-num" style={{ fontSize: "1.1rem", color: "var(--parchment)" }}>{bestTrade.buyPrice?.toLocaleString()}</div>
            </div>
            {bestTrade.actualSellPrice !== null ? (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "0.7rem", color: "var(--gold)" }}>SELL @ {sellCity}</div>
                <div className="price-num" style={{ fontSize: "1.1rem", color: "var(--gold)" }}>{bestTrade.actualSellPrice.toLocaleString()}</div>
              </div>
            ) : (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>BUY @ {sellCity} (est.)</div>
                <div className="price-num" style={{ fontSize: "1.1rem", color: "var(--parchment)" }}>{bestTrade.destBuyPrice?.toLocaleString()}</div>
              </div>
            )}
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>ADJ. PROFIT</div>
              <div className="price-num" style={{ fontSize: "1.4rem", color: "var(--profit-light)", fontWeight: 600 }}>+{bestTrade.adjustedProfit?.toLocaleString()}</div>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div style={{ background: "var(--leather-light)", border: "1px solid var(--border)", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="ledger-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Buy @ {buyCity || "—"}</th>
                <th>Buy @ {sellCity || "—"}</th>
                <th>Sell @ {sellCity || "—"}</th>
                <th>Base Profit</th>
                <th>Modifier</th>
                <th>Adj. Profit</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: "center", color: "var(--text-dim)", padding: "2rem", fontFamily: "'Cormorant Garamond', serif" }}>
                  {buyCity === sellCity ? "Select two different cities." : "No price data for this route."}
                </td></tr>
              ) : rows.map((row, i) => {
                const hasProfit = (row.adjustedProfit ?? 0) > 0;
                const hasLoss   = (row.adjustedProfit ?? 0) < 0;
                const hasBonus  = row.modLabel && row.bonus !== 0;
                return (
                  <tr key={i}
                    className={row.isLocalSell ? "" : hasProfit ? "row-profit" : hasLoss ? "row-loss" : ""}
                    style={row.isLocalSell ? { opacity: 0.75 } : undefined}
                  >
                    <td style={{ color: "var(--parchment)", fontWeight: 500 }}>{row.item}</td>
                    <td className="price-num">{row.buyPrice !== null ? row.buyPrice.toLocaleString() : <span style={{ color: "var(--text-dim)" }}>—</span>}</td>
                    <td className="price-num" style={{ color: "var(--text-dim)" }}>{row.destBuyPrice !== null ? row.destBuyPrice.toLocaleString() : "—"}</td>
                    <td className="price-num" style={{ color: row.actualSellPrice !== null ? "var(--gold)" : "var(--text-dim)" }}>
                      {row.actualSellPrice !== null
                        ? <span title="Confirmed sell price">{row.actualSellPrice.toLocaleString()} <span style={{ fontSize: "0.65rem", color: "var(--profit-light)" }}>✓</span></span>
                        : "—"}
                    </td>
                    <td className="price-num" style={{ color: hasProfit ? "var(--profit-light)" : hasLoss ? "var(--loss-light)" : "var(--text-dim)" }}>
                      {row.baseProfit !== null ? `${row.baseProfit > 0 ? "+" : ""}${row.baseProfit.toLocaleString()}` : "—"}
                      {row.baseProfit !== null && !row.profitConfirmed && <span style={{ fontSize: "0.6rem", color: "var(--text-dim)", marginLeft: "0.2rem" }}>est.</span>}
                    </td>
                    <td>
                      {hasBonus ? (
                        <span title={row.modLabel} style={{ cursor: "help", fontSize: "0.82rem", whiteSpace: "nowrap" }}>
                          {row.modLabel!.split(" ")[0]}
                          <span style={{ fontSize: "0.65rem", color: row.bonus > 0 ? "var(--profit-light)" : "var(--loss-light)", marginLeft: "0.2rem" }}>
                            {row.bonus > 0 ? `+${Math.round(row.bonus * 100)}%` : `${Math.round(row.bonus * 100)}%`}
                          </span>
                        </span>
                      ) : <span style={{ color: "var(--text-dim)", fontSize: "0.72rem" }}>—</span>}
                    </td>
                    <td className="price-num" style={{ color: hasBonus ? "var(--gold)" : hasProfit ? "var(--profit-light)" : hasLoss ? "var(--loss-light)" : "var(--text-dim)", fontWeight: hasProfit ? 600 : undefined }}>
                      {row.adjustedProfit !== null ? `${row.adjustedProfit > 0 ? "+" : ""}${row.adjustedProfit.toLocaleString()}` : "—"}
                    </td>
                    <td>
                      {row.isLocalSell && <span title="Locally produced — sells for less here" style={{ cursor: "help", fontSize: "0.85rem" }}>⚠️ <span style={{ fontSize: "0.68rem", color: "var(--text-dim)" }}>local</span></span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <div style={{ marginTop: "1rem", fontSize: "0.72rem", color: "var(--text-dim)", fontFamily: "'Cormorant Garamond', serif" }}>
        ✦ Confirmed (✓) = real Sell scan data. est. = estimated from Buy price. Adj. Profit includes city modifier bonuses.
      </div>
    </PageWrapper>
    </PageFade>
  );
}
