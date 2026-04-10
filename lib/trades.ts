import type { PriceMap, TradeOpportunity } from "@/types";
import { isStale } from "./sheets";

/**
 * Compute all profitable trade opportunities across every city-pair.
 * Profit = Buy price in cityB  - Buy price in cityA (i.e., cost to acquire).
 * Only Buy-mode prices are used (per spec).
 */
export function computeTradeOpportunities(priceMap: PriceMap): TradeOpportunity[] {
  const opportunities: TradeOpportunity[] = [];

  for (const [itemName, cityMap] of Object.entries(priceMap)) {
    const cities = Object.keys(cityMap);

    for (let i = 0; i < cities.length; i++) {
      for (let j = 0; j < cities.length; j++) {
        if (i === j) continue;

        const buyCity = cities[i];
        const sellCity = cities[j];

        const buyEntry = cityMap[buyCity]?.Buy;
        const sellEntry = cityMap[sellCity]?.Buy; // "sell" = buy in the destination

        if (!buyEntry || !sellEntry) continue;

        const profit = sellEntry.price - buyEntry.price;
        if (profit <= 0) continue;

        const stale =
          isStale(buyEntry.timestamp) || isStale(sellEntry.timestamp);

        // isLocalSell: item is locally produced in the destination city.
        // Locally produced items sell for less, so estimated profit is overstated.
        const isLocalSell = sellEntry.local === true;

        opportunities.push({
          itemName,
          buyCity,
          sellCity,
          buyPrice: buyEntry.price,
          sellPrice: sellEntry.price,
          profit,
          buyTimestamp: buyEntry.timestamp,
          sellTimestamp: sellEntry.timestamp,
          isStale: stale,
          isLocalSell,
        });
      }
    }
  }

  // Deduplicate: keep the single best profit for each (item, buyCity, sellCity) triple
  const best = new Map<string, TradeOpportunity>();
  for (const opp of opportunities) {
    const key = `${opp.itemName}::${opp.buyCity}::${opp.sellCity}`;
    const existing = best.get(key);
    if (!existing || opp.profit > existing.profit) {
      best.set(key, opp);
    }
  }

  return Array.from(best.values()).sort((a, b) => {
    // Local-sell routes are deprioritised — sort them below non-local at same profit level
    if (a.isLocalSell !== b.isLocalSell) return a.isLocalSell ? 1 : -1;
    return b.profit - a.profit;
  });
}
