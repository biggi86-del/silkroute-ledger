import { NextResponse } from "next/server";
import {
  fetchAllRows,
  getLatestPrices,
  buildPriceMap,
  getAllCities,
  getAllItems,
  formatAge,
  clearCache,
} from "@/lib/sheets";
import { computeTradeOpportunities } from "@/lib/trades";
import { fetchModifiers, clearModifierCache } from "@/lib/modifiers";
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
    // Fetch price rows and modifiers in parallel
    const [allRows, modifierMap] = await Promise.all([
      fetchAllRows(),
      fetchModifiers().catch(() => ({})), // modifiers are optional — don't crash if tab missing
    ]);

    const latestEntries = getLatestPrices(allRows);
    const priceMap = buildPriceMap(latestEntries);
    const cities = getAllCities(latestEntries);
    const items = getAllItems(latestEntries);
    const trades = computeTradeOpportunities(priceMap, modifierMap);

    const freshness: CityFreshness[] = cities.map((city) => {
      const cityRows = allRows.filter((r) => r.city === city);
      const timestamps = cityRows
        .map((r) => new Date(r.timestamp).getTime())
        .filter((t) => !isNaN(t));
      const latest = timestamps.length ? Math.max(...timestamps) : null;
      const ageMinutes = latest
        ? Math.abs((Date.now() - latest) / 60_000)
        : null;
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

    const recentActivity = [...allRows]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 20)
      .map((r) => ({ ...r, ageLabel: formatAge(r.timestamp) }));

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
        recentActivity,
        latestEntries,
        fetchedAt: new Date().toISOString(),
        modeCounts: { buy: buyCount, sell: sellCount },
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
