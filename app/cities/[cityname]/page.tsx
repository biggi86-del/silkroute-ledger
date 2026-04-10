"use client";

import { useEffect, useState, use } from "react";
import { notFound } from "next/navigation";
import PageWrapper from "@/components/PageWrapper";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorDisplay from "@/components/ErrorDisplay";
import type { PriceMap, TradeOpportunity } from "@/types";

interface ApiData {
  cities: string[];
  priceMap: PriceMap;
  items: string[];
  trades: TradeOpportunity[];
}

function formatAge(ts: string) {
  const mins = (Date.now() - new Date(ts).getTime()) / 60_000;
  if (mins < 60) return `${Math.round(mins)}m ago`;
  const hrs = mins / 60;
  if (hrs < 24) return `${hrs.toFixed(1)}h ago`;
  return `${(hrs / 24).toFixed(1)}d ago`;
}

export default function CityPage({
  params,
}: {
  params: Promise<{ cityname: string }>;
}) {
  const { cityname } = use(params);
  const [data, setData] = useState<ApiData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFoundFlag, setNotFoundFlag] = useState(false);

  useEffect(() => {
    fetch("/api/data")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d: ApiData) => {
        // Check if city exists (case-insensitive)
        const match = d.cities.find(
          (c) => c.toLowerCase() === cityname.toLowerCase()
        );
        if (!match) {
          setNotFoundFlag(true);
          return;
        }
        setData(d);
      })
      .catch((e) => setError(e.message));
  }, [cityname]);

  if (notFoundFlag) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "6rem",
          color: "var(--text-muted)",
        }}
      >
        <div style={{ fontSize: "3rem", color: "var(--gold-dim)" }}>⚖</div>
        <h2
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "2rem",
            color: "var(--gold)",
            margin: 0,
          }}
        >
          Unknown City
        </h2>
        <p
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "1.1rem",
            color: "var(--text-dim)",
          }}
        >
          &ldquo;{cityname}&rdquo; has not yet appeared in the ledger.
        </p>
        <a
          href="/"
          style={{
            color: "var(--gold)",
            fontSize: "0.85rem",
            textDecoration: "none",
          }}
        >
          ← Return to Overview
        </a>
      </div>
    );
  }

  if (error) return <ErrorDisplay message={`Failed to load: ${error}`} />;
  if (!data) return <LoadingSpinner />;

  // Resolve actual city name (correct casing)
  const cityName =
    data.cities.find((c) => c.toLowerCase() === cityname.toLowerCase()) ??
    cityname;

  const { priceMap, items, trades } = data;

  // All buy entries for this city
  const cityBuyItems = items
    .map((item) => {
      const entry = priceMap[item]?.[cityName]?.Buy;
      return entry ? { item, entry } : null;
    })
    .filter(Boolean) as { item: string; entry: NonNullable<typeof priceMap[string][string]["Buy"]> }[];

  const citySellItems = items
    .map((item) => {
      const entry = priceMap[item]?.[cityName]?.Sell;
      return entry ? { item, entry } : null;
    })
    .filter(Boolean) as { item: string; entry: NonNullable<typeof priceMap[string][string]["Sell"]> }[];

  // Find globally cheapest Buy price per item
  const globalCheapest: Record<string, { city: string; price: number }> = {};
  for (const item of items) {
    let minPrice = Infinity;
    let minCity = "";
    for (const city of data.cities) {
      const entry = priceMap[item]?.[city]?.Buy;
      if (entry && entry.price < minPrice) {
        minPrice = entry.price;
        minCity = city;
      }
    }
    if (minCity) globalCheapest[item] = { city: minCity, price: minPrice };
  }

  // Trade routes originating from / arriving at this city
  const exportRoutes = trades.filter((t) => t.buyCity === cityName);
  const importRoutes = trades.filter((t) => t.sellCity === cityName);

  return (
    <PageWrapper
      title={cityName}
      subtitle={`City intelligence — ${cityBuyItems.length} buy prices, ${citySellItems.length} sell prices on record`}
      actions={
        <a
          href="/"
          style={{
            fontSize: "0.8rem",
            color: "var(--text-dim)",
            textDecoration: "none",
          }}
        >
          ← All Cities
        </a>
      }
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
          gap: "1.5rem",
          marginBottom: "2rem",
        }}
      >
        {/* Buy Prices */}
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
              Buy Prices
            </h2>
            <div
              style={{
                fontSize: "0.72rem",
                color: "var(--text-dim)",
                marginTop: "0.2rem",
              }}
            >
              What you can purchase in {cityName}
            </div>
          </div>
          <table className="ledger-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Price</th>
                <th>Store</th>
                <th>Age</th>
                <th>★</th>
              </tr>
            </thead>
            <tbody>
              {cityBuyItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      textAlign: "center",
                      color: "var(--text-dim)",
                      padding: "1.5rem",
                      fontFamily: "'Cormorant Garamond', serif",
                    }}
                  >
                    No buy data recorded yet
                  </td>
                </tr>
              ) : (
                cityBuyItems
                  .sort((a, b) => a.item.localeCompare(b.item))
                  .map(({ item, entry }) => {
                    const isCheapest =
                      globalCheapest[item]?.city === cityName;
                    return (
                      <tr
                        key={item}
                        style={{
                          background: isCheapest
                            ? "rgba(74,124,89,0.08)"
                            : undefined,
                        }}
                      >
                        <td style={{ color: "var(--parchment)" }}>{item}</td>
                        <td
                          className="price-num"
                          style={{
                            color: isCheapest
                              ? "var(--profit-light)"
                              : "var(--parchment)",
                            fontWeight: isCheapest ? 600 : undefined,
                          }}
                        >
                          {entry.price.toLocaleString()}
                        </td>
                        <td style={{ color: "var(--text-dim)" }}>
                          {entry.store}
                        </td>
                        <td style={{ color: "var(--text-dim)", fontSize: "0.7rem" }}>
                          {formatAge(entry.timestamp)}
                        </td>
                        <td>
                          {isCheapest && (
                            <span
                              title="Globally cheapest buy price"
                              style={{
                                color: "var(--gold)",
                                fontSize: "0.85rem",
                              }}
                            >
                              ★
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

        {/* Sell Prices */}
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
              Sell Prices
            </h2>
            <div
              style={{
                fontSize: "0.72rem",
                color: "var(--text-dim)",
                marginTop: "0.2rem",
              }}
            >
              Recorded sell prices in {cityName}
            </div>
          </div>
          <table className="ledger-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Price</th>
                <th>Store</th>
                <th>Age</th>
              </tr>
            </thead>
            <tbody>
              {citySellItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    style={{
                      textAlign: "center",
                      color: "var(--text-dim)",
                      padding: "1.5rem",
                      fontFamily: "'Cormorant Garamond', serif",
                    }}
                  >
                    No sell data recorded yet
                  </td>
                </tr>
              ) : (
                citySellItems
                  .sort((a, b) => a.item.localeCompare(b.item))
                  .map(({ item, entry }) => (
                    <tr key={item}>
                      <td style={{ color: "var(--parchment)" }}>{item}</td>
                      <td className="price-num">{entry.price.toLocaleString()}</td>
                      <td style={{ color: "var(--text-dim)" }}>{entry.store}</td>
                      <td style={{ color: "var(--text-dim)", fontSize: "0.7rem" }}>
                        {formatAge(entry.timestamp)}
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Export Routes */}
      <div style={{ marginBottom: "2rem" }}>
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
            <div>
              <h2
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: "1.2rem",
                  color: "var(--gold)",
                  margin: 0,
                }}
              >
                📦 Export Routes from {cityName}
              </h2>
              <div
                style={{
                  fontSize: "0.72rem",
                  color: "var(--text-dim)",
                  marginTop: "0.2rem",
                }}
              >
                Buy here, sell elsewhere for profit
              </div>
            </div>
            <span
              style={{
                background: "rgba(74,124,89,0.15)",
                border: "1px solid rgba(74,124,89,0.3)",
                color: "var(--profit-light)",
                padding: "0.15rem 0.5rem",
                borderRadius: 2,
                fontSize: "0.72rem",
              }}
            >
              EXPORT
            </span>
          </div>
          <table className="ledger-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Buy Price</th>
                <th>Sell In</th>
                <th>Dest. Price</th>
                <th>Profit / Unit</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {exportRoutes.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      textAlign: "center",
                      color: "var(--text-dim)",
                      padding: "1.5rem",
                      fontFamily: "'Cormorant Garamond', serif",
                    }}
                  >
                    No profitable export routes found
                  </td>
                </tr>
              ) : (
                exportRoutes.map((t, i) => (
                  <tr key={i} className="row-profit">
                    <td style={{ color: "var(--parchment)", fontWeight: 500 }}>
                      {t.itemName}
                    </td>
                    <td className="price-num">{t.buyPrice.toLocaleString()}</td>
                    <td style={{ color: "var(--text-muted)" }}>
                      <a
                        href={`/cities/${t.sellCity.toLowerCase()}`}
                        style={{ color: "inherit", textDecoration: "none" }}
                      >
                        {t.sellCity}
                      </a>
                    </td>
                    <td className="price-num">{t.sellPrice.toLocaleString()}</td>
                    <td
                      className="price-num"
                      style={{ color: "var(--profit-light)", fontWeight: 600 }}
                    >
                      +{t.profit.toLocaleString()}
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Import Routes */}
      <div>
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
            <div>
              <h2
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: "1.2rem",
                  color: "var(--gold)",
                  margin: 0,
                }}
              >
                📥 Import Routes to {cityName}
              </h2>
              <div
                style={{
                  fontSize: "0.72rem",
                  color: "var(--text-dim)",
                  marginTop: "0.2rem",
                }}
              >
                Buy elsewhere, sell here for profit
              </div>
            </div>
            <span
              style={{
                background: "rgba(201,162,74,0.1)",
                border: "1px solid rgba(201,162,74,0.3)",
                color: "var(--gold)",
                padding: "0.15rem 0.5rem",
                borderRadius: 2,
                fontSize: "0.72rem",
              }}
            >
              IMPORT
            </span>
          </div>
          <table className="ledger-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Buy In</th>
                <th>Buy Price</th>
                <th>Price Here</th>
                <th>Profit / Unit</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {importRoutes.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      textAlign: "center",
                      color: "var(--text-dim)",
                      padding: "1.5rem",
                      fontFamily: "'Cormorant Garamond', serif",
                    }}
                  >
                    No profitable import routes found
                  </td>
                </tr>
              ) : (
                importRoutes.map((t, i) => (
                  <tr key={i} className="row-profit">
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
                    <td className="price-num">{t.buyPrice.toLocaleString()}</td>
                    <td className="price-num">{t.sellPrice.toLocaleString()}</td>
                    <td
                      className="price-num"
                      style={{ color: "var(--profit-light)", fontWeight: 600 }}
                    >
                      +{t.profit.toLocaleString()}
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
