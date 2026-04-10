import type { PriceMap, TradeOpportunity } from "@/types";
import { isStale } from "./sheets";

/**
 * Compute all profitable trade opportunities across every city-pair.
 *
 * Profit priority:
 *   1. CONFIRMED  — actual Sell entry exists in destination city
 *                   Profit = Sell price in dest - Buy price in origin
 *   2. ESTIMATED  — no Sell data; use Buy price in destination as proxy
 *                   Profit = Buy price in dest - Buy price in origin
 *
 * Confirmed routes are sorted above estimated ones at the same profit level.
 */
export function computeTradeOpportunities(priceMap: PriceMap): TradeOpportunity[] {
  const opportunities: TradeOpportunity[] = [];

  for (const [itemName, cityMap] of Object.entries(priceMap)) {
    const cities = Object.keys(cityMap);

    for (let i = 0; i < cities.length; i++) {
      for (let j = 0; j < cities.length; j++) {
        if (i === j) continue;

        const buyCity  = cities[i];
        const sellCity = cities[j];

        const buyEntry = cityMap[buyCity]?.Buy;
        if (!buyEntry) continue;

        // Prefer actual Sell entry in the destination; fall back to Buy price estimate
        const actualSellEntry    = cityMap[sellCity]?.Sell;
        const estimatedSellEntry = cityMap[sellCity]?.Buy;
        const sellEntry = actualSellEntry ?? estimatedSellEntry;
        if (!sellEntry) continue;

        const profit = sellEntry.price - buyEntry.price;
        if (profit <= 0) continue;

        const profitConfirmed = !!actualSellEntry;
        const stale = isStale(buyEntry.timestamp) || isStale(sellEntry.timestamp);
        const isLocalSell = sellEntry.local === true;

        opportunities.push({
          itemName,
          buyCity,
          sellCity,
          buyPrice:      buyEntry.price,
          sellPrice:     sellEntry.price,
          profit,
          buyTimestamp:  buyEntry.timestamp,
          sellTimestamp: sellEntry.timestamp,
          isStale:       stale,
          isLocalSell,
          profitConfirmed,
        });
      }
    }
  }

  // Deduplicate: keep highest profit per (item, buyCity, sellCity)
  const best = new Map<string, TradeOpportunity>();
  for (const opp of opportunities) {
    const key = `${opp.itemName}::${opp.buyCity}::${opp.sellCity}`;
    const existing = best.get(key);
    // Prefer confirmed over estimated; then higher profit
    if (
      !existing ||
      (!existing.profitConfirmed && opp.profitConfirmed) ||
      (existing.profitConfirmed === opp.profitConfirmed && opp.profit > existing.profit)
    ) {
      best.set(key, opp);
    }
  }

  return Array.from(best.values()).sort((a, b) => {
    // Confirmed beats estimated
    if (a.profitConfirmed !== b.profitConfirmed) return a.profitConfirmed ? -1 : 1;
    // Local-sell routes deprioritised
    if (a.isLocalSell !== b.isLocalSell) return a.isLocalSell ? 1 : -1;
    return b.profit - a.profit;
  });
}
