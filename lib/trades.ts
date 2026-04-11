import type { PriceMap, TradeOpportunity, ModifierMap } from "@/types";
import { isStale } from "./sheets";
import { getModifierBonus } from "./modifiers";

/**
 * Compute all profitable trade opportunities across every city-pair.
 *
 * Profit priority:
 *   1. CONFIRMED  — actual Sell entry exists in destination city
 *                   Profit = Sell price in dest - Buy price in origin
 *   2. ESTIMATED  — no Sell data; use Buy price in destination as proxy
 *
 * Modifier bonuses applied to adjusted profit when city has active modifiers.
 */
export function computeTradeOpportunities(
  priceMap: PriceMap,
  modifierMap: ModifierMap = {}
): TradeOpportunity[] {
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

        const actualSellEntry    = cityMap[sellCity]?.Sell;
        const estimatedSellEntry = cityMap[sellCity]?.Buy;
        const sellEntry = actualSellEntry ?? estimatedSellEntry;
        if (!sellEntry) continue;

        const profit = sellEntry.price - buyEntry.price;
        if (profit <= 0) continue;

        const profitConfirmed = !!actualSellEntry;
        const stale = isStale(buyEntry.timestamp) || isStale(sellEntry.timestamp);
        const isLocalSell = sellEntry.local === true;

        const { bonus, label } = getModifierBonus(itemName, sellCity, modifierMap);
        const adjustedProfit = Math.round(profit * (1 + bonus));

        opportunities.push({
          itemName,
          buyCity,
          sellCity,
          buyPrice:       buyEntry.price,
          sellPrice:      sellEntry.price,
          profit,
          adjustedProfit,
          modifierBonus:  bonus,
          modifierLabel:  label,
          buyTimestamp:   buyEntry.timestamp,
          sellTimestamp:  sellEntry.timestamp,
          isStale:        stale,
          isLocalSell,
          profitConfirmed,
        });
      }
    }
  }

  // Deduplicate: keep best per (item, buyCity, sellCity) — prefer confirmed, then highest adjustedProfit
  const best = new Map<string, TradeOpportunity>();
  for (const opp of opportunities) {
    const key = `${opp.itemName}::${opp.buyCity}::${opp.sellCity}`;
    const existing = best.get(key);
    if (
      !existing ||
      (!existing.profitConfirmed && opp.profitConfirmed) ||
      (existing.profitConfirmed === opp.profitConfirmed && opp.adjustedProfit > existing.adjustedProfit)
    ) {
      best.set(key, opp);
    }
  }

  return Array.from(best.values()).sort((a, b) => {
    if (a.profitConfirmed !== b.profitConfirmed) return a.profitConfirmed ? -1 : 1;
    if (a.isLocalSell !== b.isLocalSell) return a.isLocalSell ? 1 : -1;
    return b.adjustedProfit - a.adjustedProfit;
  });
}
