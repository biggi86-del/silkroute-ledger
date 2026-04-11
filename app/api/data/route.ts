import { NextResponse } from "next/server";
import {
  fetchAllRows,
  getLatestPrices,
  buildPriceMap,
  getAllCities,
  getAllItems,
  formatAge,
  clearCache,
  computePriceChanges,
} from "@/lib/sheets";
import { computeTradeOpportunities } from "@/lib/trades";
import { fetchModifiers, clearModifierCache } from "@/lib/modifiers";
import { computeRoutes } from "@/lib/planner";
import { apiGuard, buildCorsHeaders } from "@/lib/apiGuard";
import type { CityFreshness, DashboardStats } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const guard = apiGuard(request);
  if (guard) return guard;

  const corsHeaders = buildCorsHeaders(request);

  const { searchParams } = new URL(request.url);
  if (searchParams.get("refresh") === "true") {
    clearCache();
    clearModifierCache();
  }

  const headers = {
    ...corsHeaders,
    "Cache-Control": "no-store, must-revalidate",
    "Pragma": "no-cache",
  };

  try {
    const [allRows, modifierMap] = await Promise.all([
      fetchAllRows(),
      fetchModifiers().catch(() => ({})),
    ]);

    const latestEntries = getLatestPrices(allRows);
    const priceMap      = buildPriceMap(latestEntries);
    const cities        = getAllCities(latestEntries);
    const items         = getAllItems(latestEntries);
    const trades        = computeTradeOpportunities(priceMap, modifierMap);
    const priceChanges  = computePriceChanges(allRows);

    // City freshness + item count per city
    const freshness: (CityFreshness & { itemCount: number })[] = cities.map((city) => {
      const cityRows = allRows.filter((r) => r.city === city);
      const timestamps = cityRows.map((r) => new Date(r.timestamp).getTime()).filter((t) => !isNaN(t));
      const latest = timestamps.length ? Math.max(...timestamps) : null;
      const ageMinutes = latest ? Math.abs((Date.now() - latest) / 60_000) : null;
      // Count distinct items with a Buy price in this city
      const itemCount = new Set(
        latestEntries.filter((e) => e.city === city && e.mode === "Buy").map((e) => e.itemName)
      ).size;
      return {
        city,
        latestTimestamp: latest ? new Date(latest).toISOString() : null,
        ageMinutes,
        scanCount: cityRows.length,
        itemCount,
      };
    });

    const stats: DashboardStats = {
      totalScans:   allRows.length,
      itemsTracked: items.length,
      citiesMapped: cities.length,
      bestTrade:    trades[0] ?? null,
    };

    // Best loop summary — run planner with defaults (5 item types, 21 slots)
    let bestLoop: { cities: string[]; totalProfit: number; stops: number; tradedUnits: number } | null = null;
    try {
      const topRoutes = computeRoutes(cities, items, priceMap, modifierMap, 5, 21);
      if (topRoutes.length > 0) {
        const top = topRoutes[0];
        const tradedUnits = top.legs.reduce(
          (s, l) => s + l.sell.reduce((ss, i) => ss + i.slots, 0), 0
        );
        bestLoop = {
          cities:      top.cities,
          totalProfit: top.totalProfit,
          stops:       top.cities.length,
          tradedUnits,
        };
      }
    } catch {
      // Loop computation is optional — don't let it crash the endpoint
    }

    const buyCount  = allRows.filter((r) => r.mode === "Buy").length;
    const sellCount = allRows.filter((r) => r.mode === "Sell").length;

    return NextResponse.json(
      {
        stats,
        trades,
        freshness,
        priceMap,
        cities,
        items,
        modifierMap,
        latestEntries,
        fetchedAt: new Date().toISOString(),
        modeCounts: { buy: buyCount, sell: sellCount },
        priceChanges,
        bestLoop,
      },
      { headers }
    );
  } catch (err) {
    console.error("[/api/data]", err);
    return NextResponse.json(
      { error: "Failed to fetch data" },
      { status: 500, headers }
    );
  }
}

export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 204,
    headers: buildCorsHeaders(request),
  });
}
