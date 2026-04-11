/**
 * Shared route-planning algorithm — no server-only imports.
 * Used by both /planner page (client) and /api/data (server).
 */
import type { PriceMap, ModifierMap, PlannerRoute, PlannerLeg, PlannerItem } from "@/types";
import { getModifierBonus } from "@/lib/modifiers-client";

export function permutations<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [arr];
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const perm of permutations(rest)) result.push([arr[i], ...perm]);
  }
  return result;
}

export function allocateSlots(items: PlannerItem[], totalSlots: number): number[] {
  if (items.length === 0) return [];
  const totalProfit = items.reduce((s, i) => s + Math.max(i.profit, 1), 0);
  const initial = items.map((item) =>
    Math.floor((Math.max(item.profit, 1) / totalProfit) * totalSlots)
  );
  const remainder = totalSlots - initial.reduce((s, n) => s + n, 0);
  return initial.map((n, i) => n + (i < remainder ? 1 : 0));
}

export function getBestItemsForLeg(
  fromCity: string,
  toCity: string,
  priceMap: PriceMap,
  modifierMap: ModifierMap,
  items: string[],
  itemTypes: number,
  totalSlots: number
): PlannerItem[] {
  const candidates: PlannerItem[] = [];
  for (const itemName of items) {
    const buyEntry = priceMap[itemName]?.[fromCity]?.Buy;
    if (!buyEntry) continue;
    const actualSell    = priceMap[itemName]?.[toCity]?.Sell;
    const estimatedSell = priceMap[itemName]?.[toCity]?.Buy;
    const sellEntry = actualSell ?? estimatedSell;
    if (!sellEntry || sellEntry.local) continue;
    const baseProfit = sellEntry.price - buyEntry.price;
    if (baseProfit <= 0) continue;
    const { bonus, label } = getModifierBonus(itemName, toCity, modifierMap);
    const adjustedProfit = Math.round(baseProfit * (1 + bonus));
    candidates.push({
      itemName,
      buyPrice:        buyEntry.price,
      sellPrice:       sellEntry.price,
      profit:          adjustedProfit,
      profitConfirmed: !!actualSell,
      isLocal:         sellEntry.local,
      modifierLabel:   label,
      slots:           0,
      quantityProfit:  0,
    });
  }
  const top = candidates.sort((a, b) => b.profit - a.profit).slice(0, itemTypes);
  const slotAllocation = allocateSlots(top, totalSlots);
  return top.map((item, i) => ({
    ...item,
    slots:          slotAllocation[i],
    quantityProfit: item.profit * slotAllocation[i],
  }));
}

export function computeRoutes(
  selectedCities: string[],
  items: string[],
  priceMap: PriceMap,
  modifierMap: ModifierMap,
  itemTypes: number,
  totalSlots: number
): PlannerRoute[] {
  if (selectedCities.length < 2) return [];
  const routes: PlannerRoute[] = [];
  const [fixed, ...rest] = selectedCities;
  for (const perm of permutations(rest)) {
    const cityOrder = [fixed, ...perm];
    const legs: PlannerLeg[] = [];
    let totalProfit = 0;
    for (let i = 0; i < cityOrder.length; i++) {
      const fromCity = cityOrder[i];
      const toCity   = cityOrder[(i + 1) % cityOrder.length];
      const prevFrom = cityOrder[(i - 1 + cityOrder.length) % cityOrder.length];
      const buy  = getBestItemsForLeg(fromCity, toCity, priceMap, modifierMap, items, itemTypes, totalSlots);
      const sell = getBestItemsForLeg(prevFrom, fromCity, priceMap, modifierMap, items, itemTypes, totalSlots);
      const legProfit = sell.reduce((s, item) => s + item.quantityProfit, 0);
      totalProfit += legProfit;
      const slotsUsed = buy.reduce((s, item) => s + item.slots, 0);
      legs.push({ fromCity, toCity, buy, sell, legProfit, slotsUsed, totalSlots });
    }
    routes.push({ cities: cityOrder, legs, totalProfit });
  }
  return routes.sort((a, b) => b.totalProfit - a.totalProfit);
}
