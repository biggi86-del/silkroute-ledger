"use client";

import { useEffect, useState, useCallback } from "react";
import PageWrapper from "@/components/PageWrapper";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorDisplay from "@/components/ErrorDisplay";
import PriceChart from "@/components/PriceChart";

interface HistoryRow {
  timestamp: string;
  city: string;
  mode: "Buy" | "Sell";
  price: number;
  store: string;
  itemName: string;
}

export default function HistoryPage() {
  const [items, setItems] = useState<string[]>([]);
  const [selectedItem, setSelectedItem] = useState<string>("");
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [loadingChart, setLoadingChart] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load items list on mount
  useEffect(() => {
    fetch("/api/data")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => {
        setItems(d.items ?? []);
        if (d.items?.length > 0) {
          setSelectedItem(d.items[0]);
        }
        setLoadingItems(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoadingItems(false);
      });
  }, []);

  // Load history when item changes
  const loadHistory = useCallback((item: string) => {
    if (!item) return;
    setLoadingChart(true);
    fetch(`/api/history?item=${encodeURIComponent(item)}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => {
        setRows(d.rows ?? []);
        setLoadingChart(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoadingChart(false);
      });
  }, []);

  useEffect(() => {
    if (selectedItem) loadHistory(selectedItem);
  }, [selectedItem, loadHistory]);

  if (error) return <ErrorDisplay message={`Failed to load: ${error}`} />;
  if (loadingItems) return <LoadingSpinner />;

  return (
    <PageWrapper
      title="Price History"
      subtitle="Track how prices have changed across cities over time"
    >
      {/* Item Selector */}
      <div style={{ marginBottom: "1.5rem" }}>
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
          Select Item
        </label>
        <select
          className="ledger-select"
          value={selectedItem}
          onChange={(e) => setSelectedItem(e.target.value)}
          style={{ minWidth: 240 }}
        >
          {items.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      {/* Chart */}
      <div
        style={{
          background: "var(--leather-light)",
          border: "1px solid var(--border)",
          borderRadius: 4,
          padding: "1.5rem",
          marginBottom: "1.5rem",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.25rem",
          }}
        >
          <h2
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "1.3rem",
              color: "var(--gold)",
              margin: 0,
            }}
          >
            {selectedItem || "Select an item"}
          </h2>
          <div
            style={{
              display: "flex",
              gap: "1.5rem",
              fontSize: "0.72rem",
              color: "var(--text-dim)",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <svg width="20" height="2" style={{ overflow: "visible" }}>
                <line x1="0" y1="1" x2="20" y2="1" stroke="var(--profit-light)" strokeWidth="2" />
              </svg>
              Buy price
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <svg width="20" height="2" style={{ overflow: "visible" }}>
                <line x1="0" y1="1" x2="20" y2="1" stroke="var(--gold)" strokeWidth="2" strokeDasharray="4 2" />
              </svg>
              Sell price
            </span>
          </div>
        </div>

        {loadingChart ? (
          <LoadingSpinner message="Loading price history…" />
        ) : rows.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              color: "var(--text-dim)",
              padding: "3rem",
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "1.1rem",
            }}
          >
            No price history available for this item.
          </div>
        ) : (
          <PriceChart rows={rows} />
        )}
      </div>

      {/* Raw data table */}
      {rows.length > 0 && (
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
                fontSize: "1.1rem",
                color: "var(--gold)",
                margin: 0,
              }}
            >
              Raw Data — {rows.length} records
            </h2>
          </div>
          <div style={{ overflowX: "auto", maxHeight: 400, overflowY: "auto" }}>
            <table className="ledger-table">
              <thead
                style={{
                  position: "sticky",
                  top: 0,
                  zIndex: 1,
                }}
              >
                <tr>
                  <th>Timestamp</th>
                  <th>City</th>
                  <th>Store</th>
                  <th>Mode</th>
                  <th>Price</th>
                </tr>
              </thead>
              <tbody>
                {[...rows]
                  .reverse()
                  .map((row, i) => (
                    <tr key={i}>
                      <td style={{ color: "var(--text-dim)", fontSize: "0.7rem" }}>
                        {new Date(row.timestamp).toLocaleString()}
                      </td>
                      <td style={{ color: "var(--text-muted)" }}>{row.city}</td>
                      <td style={{ color: "var(--text-dim)" }}>{row.store}</td>
                      <td>
                        <span
                          style={{
                            color:
                              row.mode === "Buy"
                                ? "var(--profit-light)"
                                : "var(--gold)",
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
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
