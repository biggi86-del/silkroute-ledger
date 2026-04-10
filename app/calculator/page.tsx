"use client";

import { useEffect, useState, useMemo } from "react";
import PageWrapper from "@/components/PageWrapper";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorDisplay from "@/components/ErrorDisplay";
import type { PriceMap } from "@/types";

interface ApiData {
  cities: string[];
  items: string[];
  priceMap: PriceMap;
}

export default function CalculatorPage() {
  const [data, setData] = useState<ApiData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [buyCity, setBuyCity] = useState<string>("");
  const [sellCity, setSellCity] = useState<string>("");

  useEffect(() => {
    fetch("/api/data")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => {
        setData(d);
        if (d.cities?.length >= 2) {
          setBuyCity(d.cities[0]);
          setSellCity(d.cities[1]);
        }
      })
      .catch((e) => setError(e.message));
  }, []);

  const rows = useMemo(() => {
    if (!data || !buyCity || !sellCity) return [];
    const { priceMap, items } = data;
    return items
      .map((item) => {
        const buyEntry = priceMap[item]?.[buyCity]?.Buy ?? null;
        const sellEntry = priceMap[item]?.[sellCity]?.Buy ?? null;
        const buyPrice = buyEntry?.price ?? null;
        const sellPrice = sellEntry?.price ?? null;
        const profit =
          buyPrice !== null && sellPrice !== null ? sellPrice - buyPrice : null;
        const isLocalSell = sellEntry?.local === true;
        return { item, buyPrice, sellPrice, profit, buyEntry, sellEntry, isLocalSell };
      })
      .filter((r) => r.buyPrice !== null || r.sellPrice !== null)
      .sort((a, b) => {
        if (a.profit === null && b.profit === null) return 0;
        if (a.profit === null) return 1;
        if (b.profit === null) return -1;
        // Deprioritise locally-produced sell city items — profit is overstated
        if (a.isLocalSell !== b.isLocalSell) return a.isLocalSell ? 1 : -1;
        return b.profit - a.profit;
      });
  }, [data, buyCity, sellCity]);

  const bestTrade = useMemo(
    () => rows.find((r) => r.profit !== null && r.profit > 0 && !r.isLocalSell) ?? null,
    [rows]
  );

  if (error) return <ErrorDisplay message={`Failed to load: ${error}`} />;
  if (!data) return <LoadingSpinner />;

  const { cities } = data;

  return (
    <PageWrapper
      title="Trade Calculator"
      subtitle="Compare buy prices between cities to find the most profitable routes"
    >
      {/* City Selectors */}
      <div
        style={{
          display: "flex",
          gap: "1.5rem",
          alignItems: "flex-end",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
        }}
      >
        <div>
          <label
            style={{
              display: "block",
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "0.85rem",
              color: "var(--text-dim)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: "0.4rem",
            }}
          >
            Buy City (Depart From)
          </label>
          <select
            className="ledger-select"
            value={buyCity}
            onChange={(e) => setBuyCity(e.target.value)}
            style={{ minWidth: 160 }}
          >
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div
          style={{
            fontSize: "1.5rem",
            color: "var(--gold-dim)",
            paddingBottom: "0.15rem",
          }}
        >
          →
        </div>

        <div>
          <label
            style={{
              display: "block",
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "0.85rem",
              color: "var(--text-dim)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: "0.4rem",
            }}
          >
            Sell City (Destination)
          </label>
          <select
            className="ledger-select"
            value={sellCity}
            onChange={(e) => setSellCity(e.target.value)}
            style={{ minWidth: 160 }}
          >
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {buyCity === sellCity && (
          <div
            style={{
              fontSize: "0.8rem",
              color: "var(--loss-light)",
              paddingBottom: "0.2rem",
            }}
          >
            ⚠ Select different cities
          </div>
        )}
      </div>

      {/* Best Trade Card */}
      {bestTrade && buyCity !== sellCity && (
        <div
          style={{
            background: "rgba(74,124,89,0.1)",
            border: "1px solid rgba(74,124,89,0.35)",
            borderRadius: 4,
            padding: "1rem 1.5rem",
            marginBottom: "1.5rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "0.8rem",
                color: "var(--text-dim)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: "0.25rem",
              }}
            >
              Best Trade on this Route
            </div>
            <div
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "1.3rem",
                color: "var(--parchment)",
              }}
            >
              {bestTrade.item}
            </div>
          </div>
          <div style={{ display: "flex", gap: "2rem" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>
                BUY @ {buyCity}
              </div>
              <div
                className="price-num"
                style={{ fontSize: "1.1rem", color: "var(--parchment)" }}
              >
                {bestTrade.buyPrice?.toLocaleString()}
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>
                BUY @ {sellCity}
              </div>
              <div
                className="price-num"
                style={{ fontSize: "1.1rem", color: "var(--parchment)" }}
              >
                {bestTrade.sellPrice?.toLocaleString()}
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>
                PROFIT / UNIT
              </div>
              <div
                className="price-num"
                style={{
                  fontSize: "1.4rem",
                  color: "var(--profit-light)",
                  fontWeight: 600,
                }}
              >
                +{bestTrade.profit?.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results Table */}
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
                <th>Item</th>
                <th>Buy @ {buyCity || "—"}</th>
                <th>Buy @ {sellCity || "—"}</th>
                <th>Profit / Unit</th>
                <th>Direction</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
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
                    {buyCity === sellCity
                      ? "Select two different cities to compare."
                      : "No price data available for this route."}
                  </td>
                </tr>
              ) : (
                rows.map((row, i) => {
                  const hasProfit = row.profit !== null && row.profit > 0;
                  const hasLoss = row.profit !== null && row.profit < 0;
                  return (
                    <tr
                      key={i}
                      className={
                        row.isLocalSell ? "" : hasProfit ? "row-profit" : hasLoss ? "row-loss" : ""
                      }
                      style={row.isLocalSell ? { opacity: 0.75 } : undefined}
                    >
                      <td style={{ color: "var(--parchment)", fontWeight: 500 }}>
                        {row.item}
                      </td>
                      <td className="price-num">
                        {row.buyPrice !== null
                          ? row.buyPrice.toLocaleString()
                          : <span style={{ color: "var(--text-dim)" }}>—</span>}
                      </td>
                      <td className="price-num">
                        {row.sellPrice !== null
                          ? row.sellPrice.toLocaleString()
                          : <span style={{ color: "var(--text-dim)" }}>—</span>}
                      </td>
                      <td
                        className="price-num"
                        style={{
                          color: hasProfit
                            ? "var(--profit-light)"
                            : hasLoss
                            ? "var(--loss-light)"
                            : "var(--text-dim)",
                          fontWeight: hasProfit ? 600 : undefined,
                        }}
                      >
                        {row.profit !== null
                          ? `${row.profit > 0 ? "+" : ""}${row.profit.toLocaleString()}`
                          : "—"}
                      </td>
                      <td>
                        {row.profit !== null && row.profit !== 0 ? (
                          <span
                            style={{
                              fontSize: "0.72rem",
                              color: hasProfit
                                ? "var(--profit-light)"
                                : "var(--loss-light)",
                            }}
                          >
                            {hasProfit
                              ? `${buyCity} → ${sellCity}`
                              : `${sellCity} → ${buyCity}`}
                          </span>
                        ) : (
                          <span style={{ color: "var(--text-dim)", fontSize: "0.72rem" }}>
                            —
                          </span>
                        )}
                      </td>
                      <td>
                        {row.isLocalSell && (
                          <span
                            title="Locally produced — sells for less here. Estimated profit may be overstated."
                            style={{
                              cursor: "help",
                              fontSize: "0.85rem",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.3rem",
                              color: "var(--gold)",
                            }}
                          >
                            ⚠️ <span style={{ fontSize: "0.68rem", color: "var(--text-dim)" }}>local</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div
        style={{
          marginTop: "1rem",
          fontSize: "0.72rem",
          color: "var(--text-dim)",
          fontFamily: "'Cormorant Garamond', serif",
          letterSpacing: "0.04em",
        }}
      >
        ✦ Profit calculated as: (Buy price in destination) − (Buy price in origin). Only Buy-mode prices used.
      </div>
    </PageWrapper>
  );
}
