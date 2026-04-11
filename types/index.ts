export interface RawRow {
  timestamp: string;
  city: string;
  store: string;
  mode: "Buy" | "Sell";
  itemName: string;
  price: number;
  local: boolean;
}

export interface PriceEntry {
  timestamp: string;
  city: string;
  store: string;
  mode: "Buy" | "Sell";
  itemName: string;
  price: number;
  local: boolean;
}

// Keyed by itemName → city → mode → latest PriceEntry
export interface PriceMap {
  [itemName: string]: {
    [city: string]: {
      Buy?: PriceEntry;
      Sell?: PriceEntry;
    };
  };
}

// ── City Modifiers ──────────────────────────────────────────────────────────

export interface CityModifier {
  city: string;
  name: string;
  effectText: string;
  pct: number;
  direction: 1 | -1;
  categories: string[];
  emoji: string;
  type: "economic" | "cultural" | "language"; // cultural/language = display only, no price effect
}

// Keyed by city → list of modifiers active there
export type ModifierMap = Record<string, CityModifier[]>;

// ── Trade Opportunities ─────────────────────────────────────────────────────

export interface TradeOpportunity {
  itemName: string;
  buyCity: string;
  sellCity: string;
  buyPrice: number;
  sellPrice: number;
  profit: number;
  buyTimestamp: string;
  sellTimestamp: string;
  isStale: boolean;
  isLocalSell: boolean;
  profitConfirmed: boolean;
  modifierBonus: number;       // e.g. 0.15 = +15% from city modifier
  modifierLabel: string;       // e.g. "⚔️ Major Conflict (+15%)"
  adjustedProfit: number;      // profit * (1 + modifierBonus)
}

// ── Route Planner ───────────────────────────────────────────────────────────

export interface PlannerItem {
  itemName: string;
  buyPrice: number;
  sellPrice: number;
  profit: number;          // per-unit, adjusted for modifiers
  profitConfirmed: boolean;
  isLocal: boolean;
  modifierLabel: string;
  slots: number;           // cargo slots allocated to this item type
  quantityProfit: number;  // profit × slots
}

export interface PlannerLeg {
  fromCity: string;
  toCity: string;
  buy: PlannerItem[];
  sell: PlannerItem[];
  legProfit: number;       // quantity-adjusted total profit from sell items on this leg
  slotsUsed: number;       // slots allocated at this buy stop
  totalSlots: number;      // capacity (for "X/Y slots filled" display)
}

export interface PlannerRoute {
  cities: string[];
  legs: PlannerLeg[];
  totalProfit: number;     // quantity-adjusted across all legs
}

// ── Freshness / Stats ───────────────────────────────────────────────────────

export interface CityFreshness {
  city: string;
  latestTimestamp: string | null;
  ageMinutes: number | null;
  scanCount: number;
}

export interface DashboardStats {
  totalScans: number;
  itemsTracked: number;
  citiesMapped: number;
  bestTrade: TradeOpportunity | null;
}

export interface HistoryPoint {
  timestamp: string;
  city: string;
  mode: "Buy" | "Sell";
  price: number;
}

export interface PriceChange {
  itemName: string;
  city: string;
  mode: "Buy" | "Sell";
  oldPrice: number;
  newPrice: number;
  delta: number;
}
