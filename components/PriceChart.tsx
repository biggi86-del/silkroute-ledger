"use client";

import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Brush, ReferenceLine,
} from "recharts";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";

interface HistoryRow {
  timestamp: string;
  city: string;
  mode: "Buy" | "Sell";
  price: number;
  store: string;
  itemName: string;
}

interface Props { rows: HistoryRow[] }

const CITY_COLORS = [
  "#C9A24A", "#4A7C59", "#8B6FD4", "#5C9BD4", "#D47A5C",
  "#7CB87C", "#D4B56A", "#9B5C8A",
];

interface ChartPoint { time: string; [key: string]: string | number | null }

function ParchmentTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.12 }}
      style={{
        background: "#E8D5B5", border: "1px solid #C9A24A",
        borderRadius: 3, padding: "0.6rem 0.85rem",
        boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
        fontFamily: "'JetBrains Mono', monospace", fontSize: "0.75rem",
        color: "#2C1810", minWidth: 160,
      }}
    >
      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "0.85rem", marginBottom: "0.4rem", borderBottom: "1px solid #C4A97A", paddingBottom: "0.3rem" }}>
        {label}
      </div>
      {payload.map((p) => (
        <div key={p.name} style={{ display: "flex", justifyContent: "space-between", gap: "1rem", marginTop: "0.15rem" }}>
          <span style={{ color: p.color, fontFamily: "'Cormorant Garamond', serif" }}>{p.name}</span>
          <strong>{p.value?.toLocaleString()}</strong>
        </div>
      ))}
    </motion.div>
  );
}

export default function PriceChart({ rows }: Props) {
  const { chartData, lines, cities } = useMemo(() => {
    if (!rows.length) return { chartData: [], lines: [], cities: [] };
    const cities = Array.from(new Set(rows.map((r) => r.city))).sort();
    const timeMap = new Map<string, ChartPoint>();

    for (const row of rows) {
      const d = new Date(row.timestamp);
      const key = d.toLocaleString("en-GB", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
      if (!timeMap.has(key)) timeMap.set(key, { time: key });
      timeMap.get(key)![`${row.city} (${row.mode})`] = row.price;
    }

    const chartData = Array.from(timeMap.values());
    const lineKeys = new Set<string>();
    for (const row of rows) lineKeys.add(`${row.city} (${row.mode})`);

    const lines = Array.from(lineKeys).map((key, i) => {
      const isBuy = key.includes("(Buy)");
      const cityIndex = cities.findIndex((c) => key.startsWith(c));
      return { key, color: CITY_COLORS[cityIndex % CITY_COLORS.length], dashed: !isBuy };
    });

    return { chartData, lines, cities };
  }, [rows]);

  if (!chartData.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <ResponsiveContainer width="100%" height={380}>
        <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 40 }}>
          <defs>
            {lines.map(({ key, color }) => (
              <linearGradient key={key} id={`fill-${key.replace(/[^a-z0-9]/gi, "")}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.12} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="rgba(201,162,74,0.1)" vertical={false} />
          <XAxis
            dataKey="time"
            tick={{ fill: "#8A7060", fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}
            tickLine={false} axisLine={{ stroke: "var(--border)" }}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: "#8A7060", fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}
            tickLine={false} axisLine={{ stroke: "var(--border)" }}
            tickFormatter={(v) => v.toLocaleString()} width={60}
          />
          <Tooltip content={<ParchmentTooltip />} cursor={{ stroke: "rgba(201,162,74,0.3)", strokeWidth: 1 }} />
          <Legend wrapperStyle={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "0.85rem", color: "var(--text-muted)", paddingTop: "0.5rem" }} />

          {/* Area fills */}
          {lines.map(({ key, color }) => (
            <Area
              key={`area-${key}`} type="monotone" dataKey={key}
              fill={`url(#fill-${key.replace(/[^a-z0-9]/gi, "")})`}
              stroke="none" connectNulls={false}
            />
          ))}

          {/* Lines with animated draw */}
          {lines.map(({ key, color, dashed }) => (
            <Line
              key={key} type="monotone" dataKey={key}
              stroke={color} strokeWidth={2}
              strokeDasharray={dashed ? "5 3" : undefined}
              dot={false}
              activeDot={{ r: 5, fill: color, stroke: "#1C1410", strokeWidth: 2 }}
              connectNulls={false}
              isAnimationActive={true}
              animationDuration={1000}
              animationEasing="ease-out"
            />
          ))}

          {/* Brush / zoom selector */}
          <Brush
            dataKey="time" height={24} stroke="var(--border)"
            fill="var(--leather-mid)" travellerWidth={6}
            style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", fill: "var(--text-dim)" }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
