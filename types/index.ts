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
  name: string;          // e.g. "Major Conflict"
  effectText: string;    // raw text from the sheet
  pct: number;           // e.g. 15
  direction: 1 | -1;    // +1 = bonus, -1 = penalty
  categories: string[];  // e.g. ["weapons","metal"]
  emoji: string;         // display icon
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

export interface PlannerLeg {
  fromCity: string;
  toCity: string;
  buy: PlannerItem[];          // items to buy at fromCity
  sell: PlannerItem[];         // items sold at toCity (from previous leg's buy)
  legProfit: number;
}

export interface PlannerItem {
  itemName: string;
  buyPrice: number;
  sellPrice: number;
  profit: number;              // adjusted for modifiers
  profitConfirmed: boolean;
  isLocal: boolean;
  modifierLabel: string;
}

export interface PlannerRoute {
  cities: string[];            // ordered loop, e.g. ["Tyre","Damascus","Ecbatana"]
  legs: PlannerLeg[];
  totalProfit: number;
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
