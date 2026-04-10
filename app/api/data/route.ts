import { NextResponse } from "next/server";
import { fetchAllRows, getLatestPrices, buildPriceMap, getAllCities, getAllItems, formatAge } from "@/lib/sheets";
import { computeTradeOpportunities } from "@/lib/trades";
import { apiGuard, buildCorsHeaders } from "@/lib/apiGuard";
import type { CityFreshness, DashboardStats } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Security: rate limit + cross-origin check
  const guard = apiGuard(request);
  if (guard) return guard;

  const corsHeaders = buildCorsHeaders(request);

  try {
    const allRows = await fetchAllRows();
    const latestEntries = getLatestPrices(allRows);
    const priceMap = buildPriceMap(latestEntries);
    const cities = getAllCities(latestEntries);
    const items = getAllItems(latestEntries);
    const trades = computeTradeOpportunities(priceMap);

    // City freshness
    const freshness: CityFreshness[] = cities.map((city) => {
      const cityRows = allRows.filter((r) => r.city === city);
      const timestamps = cityRows.map((r) => new Date(r.timestamp).getTime()).filter(Boolean);
      const latest = timestamps.length ? Math.max(...timestamps) : null;
      const ageMinutes = latest ? (Date.now() - latest) / 60_000 : null;
      return {
        city,
        latestTimestamp: latest ? new Date(latest).toISOString() : null,
        ageMinutes,
        scanCount: cityRows.length,
      };
    });

    const stats: DashboardStats = {
      totalScans: allRows.length,
      itemsTracked: items.length,
      citiesMapped: cities.length,
      bestTrade: trades[0] ?? null,
    };

    // Recent activity: last 20 raw rows (most recent first)
    const recentActivity = [...allRows]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 20)
      .map((r) => ({ ...r, ageLabel: formatAge(r.timestamp) }));

    return NextResponse.json(
      { stats, trades, freshness, priceMap, cities, items, recentActivity, latestEntries },
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error("[/api/data]", err);
    return NextResponse.json(
      { error: "Failed to fetch data" },
      { status: 500, headers: corsHeaders }
    );
  }
}

// Handle preflight OPTIONS requests
export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 204,
    headers: buildCorsHeaders(request),
  });
}
