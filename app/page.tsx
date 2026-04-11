"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import CountUp from "react-countup";
import { PageFade, staggerContainer, fadeInUp, slideInLeft, scaleUp, pulseGold } from "@/components/motion";
import PageWrapper from "@/components/PageWrapper";
import LoadingSpinner, { SkeletonCard } from "@/components/LoadingSpinner";
import ErrorDisplay from "@/components/ErrorDisplay";
import RefreshButton from "@/components/RefreshButton";
import { useDataFetch } from "@/hooks/useDataFetch";
import type { TradeOpportunity, ModifierMap, CityFreshness, PriceChange } from "@/types";

interface ApiData {
  stats: { totalScans: number; itemsTracked: number; citiesMapped: number };
  trades: TradeOpportunity[];
  freshness: (CityFreshness & { itemCount: number })[];
  modifierMap: ModifierMap;
  priceChanges: PriceChange[];
  bestLoop: { cities: string[]; totalProfit: number; stops: number; tradedUnits: number } | null;
  fetchedAt?: string;
}

// ── helpers ─────────────────────────────────────────────────────────────────

function absAge(mins: number | null) {
  if (mins === null) return null;
  return Math.abs(mins);
}

function ageLabel(mins: number | null): string {
  const a = absAge(mins);
  if (a === null) return "No data";
  if (a < 2) return "just now";
  if (a < 60) return `${Math.round(a)}m ago`;
  const h = a / 60;
  if (h < 24) return `${h.toFixed(1)}h ago`;
  return `${(h / 24).toFixed(1)}d ago`;
}

function freshnessColor(mins: number | null): string {
  const a = absAge(mins);
  if (a === null) return "var(--text-dim)";
  if (a < 360) return "#4A7C59";   // <6h  green
  if (a < 1440) return "#C9A24A";  // <24h amber
  return "#8B2E2E";                 // >24h red
}

// ── Section 1: Best Trade Card ───────────────────────────────────────────────

function BestTradeCard({ trade }: { trade: TradeOpportunity }) {
  const fullCargo = (trade.adjustedProfit ?? trade.profit) * 21;

  return (
    <motion.div
      animate={{ boxShadow: ["0 0 0px rgba(201,162,74,0)", "0 0 20px rgba(201,162,74,0.3)", "0 0 0px rgba(201,162,74,0)"] }}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      className="best-trade-card"
      style={{
        borderRadius: 6,
        padding: "1.5rem 2rem",
        marginBottom: "1rem",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background accent */}
      <div style={{
        position: "absolute", top: 0, right: 0, width: 120, height: "100%",
        background: "linear-gradient(90deg, transparent, rgba(201,162,74,0.04))",
        pointerEvents: "none",
      }} />

      <div className="section-label" style={{ marginBottom: "0.75rem" }}>
        Best Trade Right Now
      </div>

      {/* Main trade line */}
      <div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: "0.5rem 1rem", marginBottom: "1rem" }}>
        <span style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: "1.9rem", fontWeight: 700,
          color: "var(--parchment)", letterSpacing: "0.02em",
        }}>
          {trade.itemName}
        </span>
        {trade.profitConfirmed ? (
          <span style={{
            fontSize: "0.7rem", background: "rgba(74,124,89,0.2)",
            border: "1px solid rgba(74,124,89,0.5)", color: "var(--profit-light)",
            padding: "0.1rem 0.5rem", borderRadius: 2,
          }}>✓ confirmed</span>
        ) : (
          <span style={{
            fontSize: "0.7rem", background: "rgba(201,162,74,0.1)",
            border: "1px solid rgba(201,162,74,0.3)", color: "var(--gold)",
            padding: "0.1rem 0.5rem", borderRadius: 2,
          }}>est.</span>
        )}
        {trade.modifierLabel && (
          <span
            title={trade.modifierLabel}
            style={{ fontSize: "0.82rem", cursor: "help", color: "var(--gold)" }}
          >
            {trade.modifierLabel}
          </span>
        )}
      </div>

      {/* Route and prices */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem 2rem", alignItems: "center", marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "0.65rem", color: "var(--text-dim)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Buy in</div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.1rem", color: "var(--parchment)", fontWeight: 600 }}>
              {trade.buyCity}
            </div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "1.1rem", color: "var(--text-muted)" }}>
              {trade.buyPrice.toLocaleString()}
            </div>
          </div>
          <div style={{ fontSize: "1.4rem", color: "var(--gold-dim)" }}>→</div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "0.65rem", color: "var(--text-dim)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Sell in</div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.1rem", color: "var(--parchment)", fontWeight: 600 }}>
              {trade.sellCity}
            </div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "1.1rem", color: "var(--text-muted)" }}>
              {trade.sellPrice.toLocaleString()}
            </div>
          </div>
        </div>

        <div style={{ width: 1, height: 48, background: "var(--border)", flexShrink: 0 }} />

        <div style={{ display: "flex", gap: "1.5rem" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "0.65rem", color: "var(--text-dim)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Per unit</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "1.6rem", color: "var(--profit-light)", fontWeight: 700 }}>
              +{(trade.adjustedProfit ?? trade.profit).toLocaleString()}
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "0.65rem", color: "var(--text-dim)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Full cargo (21)</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "1.6rem", color: "var(--profit-light)", fontWeight: 700 }}>
              +{fullCargo.toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Section 2: Best Loop Summary ─────────────────────────────────────────────

function BestLoopCard({ loop }: { loop: NonNullable<ApiData["bestLoop"]> }) {
  return (
    <div style={{
      background: "var(--leather-light)", border: "1px solid var(--border)",
      borderRadius: 4, padding: "1rem 1.5rem", marginBottom: "1rem",
      display: "flex", justifyContent: "space-between", alignItems: "center",
      flexWrap: "wrap", gap: "0.75rem",
    }}>
      <div>
        <div style={{ fontSize: "0.65rem", color: "var(--text-dim)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.3rem" }}>
          Best Loop Route
        </div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1rem", color: "var(--parchment)" }}>
          {loop.cities.join(" → ")} → {loop.cities[0]}
        </div>
        <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginTop: "0.2rem", fontFamily: "'JetBrains Mono', monospace" }}>
          {loop.stops} stops · {loop.tradedUnits} units traded
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "0.65rem", color: "var(--text-dim)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Loop Profit</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "1.3rem", color: "var(--profit-light)", fontWeight: 600 }}>
            +{loop.totalProfit.toLocaleString()}
          </div>
        </div>
        <Link href="/planner" style={{
          background: "var(--leather-mid)", border: "1px solid var(--border-gold)",
          color: "var(--gold)", padding: "0.4rem 1rem", borderRadius: 3,
          textDecoration: "none", fontFamily: "'Cormorant Garamond', serif",
          fontSize: "0.9rem", letterSpacing: "0.04em", whiteSpace: "nowrap",
        }}>
          Open Planner →
        </Link>
      </div>
    </div>
  );
}

// ── Section 3: Stats Row ─────────────────────────────────────────────────────

function StatCard({ label, value, color, numeric }: { label: string; value: string; color?: string; numeric?: number }) {
  return (
    <div className="stat-card-embossed" style={{ background: "var(--leather-light)", border: "1px solid var(--border)", borderTop: "2px solid var(--gold-dim)", borderRadius: 4, padding: "0.9rem 1.25rem", minWidth: 0, flex: 1 }}>
      <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "'Cormorant Garamond', serif", marginBottom: "0.3rem" }}>{label}</div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "1.4rem", color: color ?? "var(--parchment)", fontWeight: 500 }}>
        {numeric !== undefined ? <CountUp end={numeric} duration={0.8} separator="," /> : value}
      </div>
    </div>
  );
}

// ── Section 4: City Status ───────────────────────────────────────────────────

function CityCard({ f, modifierMap }: { f: CityFreshness & { itemCount: number }; modifierMap: ModifierMap }) {
  const econMods = (modifierMap[f.city] ?? []).filter((m) => m.type === "economic" && m.pct > 0);
  const color = freshnessColor(f.ageMinutes);
  const hasConflict = econMods.some((m) => /conflict|war|battle|plague/i.test(m.name));
  const hasHarvest  = econMods.some((m) => /harvest|abundance|boom/i.test(m.name));
  const hasPort     = econMods.some((m) => /port|harbour|harbor/i.test(m.name));
  const hasDesert   = econMods.some((m) => /desert/i.test(m.name));
  const hasFrontier = econMods.some((m) => /frontier/i.test(m.name));
  const hasCapital  = econMods.some((m) => /capital/i.test(m.name));
  const hasHomog    = econMods.some((m) => /homogen/i.test(m.name));
  const highlight   = hasConflict ? "rgba(139,46,46,0.08)" : hasHarvest ? "rgba(74,124,89,0.08)" : undefined;

  const cityClass = hasConflict ? "city-card-conflict"
    : hasHarvest  ? "city-card-harvest"
    : hasPort     ? "city-card-port"
    : hasDesert   ? "city-card-desert"
    : hasFrontier ? "city-card-frontier"
    : hasCapital  ? "city-card-capital"
    : hasHomog    ? "city-card-homog"
    : "city-card-default";

  return (
    <motion.div
      variants={scaleUp} initial="rest" whileHover="hover"
      className={cityClass}
      style={{
        background: highlight ?? "var(--leather-light)",
        borderRadius: 4, padding: "0.85rem 1rem",
        minWidth: 140, flex: "1 1 140px", cursor: "default",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.4rem" }}>
        <Link href={`/cities/${f.city.toLowerCase()}`} style={{
          fontFamily: "'Cormorant Garamond', serif", fontSize: "1rem",
          fontWeight: 700, color: "var(--gold)", textDecoration: "none",
          letterSpacing: "0.06em", textTransform: "uppercase",
        }}>
          {f.city}
        </Link>
        <span style={{
          width: 8, height: 8, borderRadius: "50%",
          background: color, flexShrink: 0, display: "inline-block",
        }} title={ageLabel(f.ageMinutes)} />
      </div>

      {/* Economic modifiers */}
      {econMods.length > 0 ? econMods.map((m, i) => (
        <div key={i} title={m.effectText} style={{
          fontSize: "0.68rem", cursor: "help",
          color: m.direction > 0 ? "var(--profit-light)" : "var(--loss-light)",
          marginBottom: "0.15rem",
        }}>
          {m.emoji} {m.name} {m.direction > 0 ? "+" : "-"}{m.pct}%
        </div>
      )) : (
        <div style={{ fontSize: "0.68rem", color: "var(--text-dim)", marginBottom: "0.15rem" }}>No active events</div>
      )}

      <div style={{ fontSize: "0.68rem", color: "var(--text-dim)", marginTop: "0.3rem" }}>
        {f.itemCount} item{f.itemCount !== 1 ? "s" : ""}
      </div>
      <div style={{ fontSize: "0.68rem", color, fontFamily: "'JetBrains Mono', monospace", marginTop: "0.1rem" }}>
        {ageLabel(f.ageMinutes)}
      </div>
    </motion.div>
  );
}

// ── Section 5: Price Changes ─────────────────────────────────────────────────

function PriceChangesCard({ changes }: { changes: PriceChange[] }) {
  return (
    <div style={{
      background: "var(--leather-light)", border: "1px solid var(--border)",
      borderRadius: 4, overflow: "hidden",
    }}>
      <div style={{
        padding: "0.7rem 1.25rem", borderBottom: "1px solid var(--border-gold)",
      }}>
        <span className="section-label">Price Changes</span>
      </div>
      <div style={{ padding: "0.5rem 0" }}>
        {changes.length === 0 ? (
          <div style={{ padding: "0.75rem 1.25rem", fontSize: "0.8rem", color: "var(--text-dim)", fontStyle: "italic" }}>
            No price changes detected
          </div>
        ) : (
          <motion.div variants={staggerContainer} initial="hidden" animate="show">
          {changes.map((c, i) => {
          const up = c.delta > 0;
          return (
            <motion.div key={i}
              variants={slideInLeft}
              style={{
                display: "flex", alignItems: "center", gap: "0.75rem",
                padding: "0.45rem 1.25rem",
                borderBottom: i < changes.length - 1 ? "1px solid rgba(61,42,26,0.3)" : undefined,
              }}>
              <span style={{ fontSize: "0.9rem", color: up ? "var(--profit-light)" : "var(--loss-light)" }}>{up ? "↑" : "↓"}</span>
              <span style={{ flex: 1, fontSize: "0.8rem", color: "var(--parchment)" }}>
                {c.itemName} <span style={{ color: "var(--text-dim)" }}>in {c.city}</span>
                <span style={{ fontSize: "0.7rem", color: "var(--text-dim)", marginLeft: "0.3rem" }}>({c.mode})</span>
              </span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                {c.oldPrice.toLocaleString()} → {c.newPrice.toLocaleString()}
              </span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.82rem", fontWeight: 600, color: up ? "var(--profit-light)" : "var(--loss-light)", minWidth: 52, textAlign: "right" }}>
                {up ? "+" : ""}{c.delta.toLocaleString()}
              </span>
            </motion.div>
          );
        })}
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function OverviewPage() {
  const { data, error, loading, refreshing, fetchedAt, refresh } = useDataFetch<ApiData>();

  if (error)   return <ErrorDisplay message={`Failed to load: ${error}`} />;
  if (loading) return <LoadingSpinner />;
  if (!data)   return null;

  const { stats, trades, freshness, modifierMap, priceChanges, bestLoop } = data;
  const bestTrade = trades[0] ?? null;

  // Data age: oldest city freshness (worst case)
  const maxAge = freshness.reduce((m, f) => {
    const a = absAge(f.ageMinutes);
    return a !== null && a > (m ?? -1) ? a : m;
  }, null as number | null);
  const dataAgeColor = freshnessColor(maxAge);

  return (
    <PageFade>
    <PageWrapper
      title="Overview"
      subtitle="Trading intelligence — updated every 60 seconds"
      actions={<RefreshButton fetchedAt={fetchedAt} refreshing={refreshing} onRefresh={refresh} />}
    >
      {bestTrade ? <BestTradeCard trade={bestTrade} /> : (
        <div style={{ border: "2px solid var(--border)", borderRadius: 6, background: "var(--leather-light)", padding: "2rem", marginBottom: "1rem", textAlign: "center", color: "var(--text-dim)", fontFamily: "'Cormorant Garamond', serif", fontSize: "1.1rem" }}>
          No trade opportunities yet — more price scans needed.
        </div>
      )}

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
        {bestLoop ? <BestLoopCard loop={bestLoop} /> : (
          <div style={{ background: "var(--leather-light)", border: "1px solid var(--border)", borderRadius: 4, padding: "0.9rem 1.5rem", marginBottom: "1rem", color: "var(--text-dim)", fontSize: "0.82rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Route planner needs more price data to calculate loops.</span>
            <Link href="/planner" style={{ color: "var(--gold)", textDecoration: "none", fontSize: "0.82rem" }}>Open Planner →</Link>
          </div>
        )}
      </motion.div>

      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        <StatCard label="Total Scans"   value={stats.totalScans.toLocaleString()}   numeric={stats.totalScans} />
        <StatCard label="Items Tracked" value={stats.itemsTracked.toLocaleString()} numeric={stats.itemsTracked} />
        <StatCard label="Cities Mapped" value={stats.citiesMapped.toString()}        numeric={stats.citiesMapped} />
        <StatCard label="Data Age"      value={ageLabel(maxAge)} color={dataAgeColor} />
      </div>

      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        {freshness.map((f) => <CityCard key={f.city} f={f} modifierMap={modifierMap} />)}
      </div>
      <PriceChangesCard changes={priceChanges} />
    </PageWrapper>
    </PageFade>
  );
}
