/**
 * Client-safe modifier utilities — no "server-only" import.
 * Used by client components (planner page) that receive modifierMap as a prop.
 */
import type { ModifierMap } from "@/types";

const CATEGORY_ITEMS: Record<string, string[]> = {
  food:           ["Wheat", "Barley", "Dried Fish", "Olive Oil", "Sea Salt"],
  agricultural:   ["Wheat", "Barley", "Dried Fish", "Olive Oil"],
  luxury:         ["Glassware", "Earthenware", "Silk", "Spices", "Perfume"],
  weapons:        ["Weapons", "Sword", "Bow", "Spear", "Shield"],
  tools:          ["Tools", "Hammer", "Pickaxe", "Saw"],
  metal:          ["Iron Ingot", "Copper Ingot", "Bronze", "Silver", "Gold"],
  textiles:       ["Linen", "Wool", "Leather", "Cotton", "Silk"],
  "trade goods":  ["Sea Salt", "Salt"],
  salt:           ["Sea Salt", "Salt"],
};

function getAffectedItems(categories: string[]): Set<string> {
  const items = new Set<string>();
  for (const cat of categories) {
    for (const item of CATEGORY_ITEMS[cat] ?? []) items.add(item);
  }
  return items;
}

/** Only applies economic modifiers — cultural/language types are display-only */
export function getModifierBonus(
  itemName: string,
  sellCity: string,
  modifierMap: ModifierMap
): { bonus: number; label: string } {
  const mods = (modifierMap[sellCity] ?? []).filter(
    (m) => (m.type ?? "economic") === "economic" && m.pct > 0
  );
  let totalBonus = 0;
  const labels: string[] = [];

  for (const mod of mods) {
    const affected = getAffectedItems(mod.categories);
    if (affected.has(itemName)) {
      totalBonus += (mod.pct / 100) * mod.direction;
      const sign = mod.direction > 0 ? "+" : "-";
      labels.push(`${mod.emoji} ${mod.name} (${sign}${mod.pct}%)`);
    }
  }
  return { bonus: totalBonus, label: labels.join(" · ") };
}
