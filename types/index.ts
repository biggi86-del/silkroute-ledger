export interface RawRow {
  timestamp: string;
  city: string;
  store: string;
  mode: "Buy" | "Sell";
  itemName: string;
  price: number;
  local: boolean; // column G — "Yes" = locally produced in this city
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

export interface TradeOpportunity {
  itemName: string;
  buyCity: string;
  sellCity: string;
  buyPrice: number;
  sellPrice: number;       // actual Sell price if confirmed, else Buy price in destination
  profit: number;
  buyTimestamp: string;
  sellTimestamp: string;
  isStale: boolean;
  isLocalSell: boolean;    // item is locally produced in the sell city
  profitConfirmed: boolean; // true = real Sell data used; false = estimated from Buy prices
}

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
