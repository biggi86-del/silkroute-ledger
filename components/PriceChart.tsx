"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useMemo } from "react";

interface HistoryRow {
  timestamp: string;
  city: string;
  mode: "Buy" | "Sell";
  price: number;
  store: string;
  itemName: string;
}

interface Props {
  rows: HistoryRow[];
}

// Distinct color palette for cities — leather/parchment-friendly
const CITY_COLORS = [
  "#C9A24A", // gold
  "#4A7C59", // profit green
  "#8B6FD4", // muted purple
  "#5C9BD4", // muted blue
  "#D47A5C", // terracotta
  "#7CB87C", // sage
  "#D4B56A", // warm gold
  "#9B5C8A", // muted mauve
];

interface ChartPoint {
  time: string;
  [key: string]: string | number | null;
}

function ParchmentTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div
      style={{
        background: "#E8D5B5",
        border: "1px solid #D4BC94",
        borderRadius: 3,
        padding: "0.6rem 0.85rem",
        boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: "0.75rem",
        color: "#2C1810",
        minWidth: 160,
      }}
    >
      <div
        style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontWeight: 600,
          fontSize: "0.85rem",
          marginBottom: "0.4rem",
          borderBottom: "1px solid #C4A97A",
          paddingBottom: "0.3rem",
        }}
      >
        {label}
      </div>
      {payload.map((p) => (
        <div
          key={p.name}
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "1rem",
            marginTop: "0.15rem",
          }}
        >
          <span style={{ color: p.color, fontFamily: "'Cormorant Garamond', serif" }}>
            {p.name}
          </span>
          <strong>{p.value?.toLocaleString()}</strong>
        </div>
      ))}
    </div>
  );
}

export default function PriceChart({ rows }: Props) {
  const { chartData, lines, cities } = useMemo(() => {
    if (!rows.length) return { chartData: [], lines: [], cities: [] };

    const cities = Array.from(new Set(rows.map((r) => r.city))).sort();

    // Build timeline: one point per unique timestamp, with price per (city, mode)
    // Group rows by timestamp bucket (minute-level)
    const timeMap = new Map<string, ChartPoint>();

    for (const row of rows) {
      const d = new Date(row.timestamp);
      // Use minute-level granularity for bucketing
      const key = d.toLocaleString("en-GB", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      if (!timeMap.has(key)) {
        timeMap.set(key, { time: key });
      }

      const point = timeMap.get(key)!;
      const fieldKey = `${row.city} (${row.mode})`;
      // Keep latest price for this bucket
      point[fieldKey] = row.price;
    }

    const chartData = Array.from(timeMap.values());

    // Build line definitions
    const lineKeys = new Set<string>();
    for (const row of rows) {
      lineKeys.add(`${row.city} (${row.mode})`);
    }

    const lines = Array.from(lineKeys).map((key, i) => {
      const isBuy = key.includes("(Buy)");
      const cityIndex = cities.findIndex((c) => key.startsWith(c));
      const color = CITY_COLORS[cityIndex % CITY_COLORS.length];
      return { key, color, dashed: !isBuy };
    });

    return { chartData, lines, cities };
  }, [rows]);

  if (!chartData.length) return null;

  return (
    <ResponsiveContainer width="100%" height={380}>
      <LineChart
        data={chartData}
        margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="rgba(201,162,74,0.1)"
          vertical={false}
        />
        <XAxis
          dataKey="time"
          tick={{
            fill: "#8A7060",
            fontSize: 10,
            fontFamily: "'JetBrains Mono', monospace",
          }}
          tickLine={false}
          axisLine={{ stroke: "var(--border)" }}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{
            fill: "#8A7060",
            fontSize: 10,
            fontFamily: "'JetBrains Mono', monospace",
          }}
          tickLine={false}
          axisLine={{ stroke: "var(--border)" }}
          tickFormatter={(v) => v.toLocaleString()}
          width={60}
        />
        <Tooltip content={<ParchmentTooltip />} />
        <Legend
          wrapperStyle={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "0.85rem",
            color: "var(--text-muted)",
            paddingTop: "0.5rem",
          }}
        />
        {lines.map(({ key, color, dashed }) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={color}
            strokeWidth={2}
            strokeDasharray={dashed ? "5 3" : undefined}
            dot={false}
            activeDot={{ r: 4, fill: color }}
            connectNulls={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
