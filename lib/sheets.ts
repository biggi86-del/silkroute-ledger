import "server-only";
import { google } from "googleapis";
import type { RawRow, PriceEntry, PriceMap, PriceChange } from "@/types";

// ---------------------------------------------------------------------------
// Sanitisation — strip HTML tags only. Do NOT HTML-encode entities —
// React renders JSX text as plain text, not HTML, so encoding apostrophes
// as &#39; causes them to display literally as "&#39;" in the browser.
// Also fix a common scanner artifact: "Khashayar 's" → "Khashayar's"
// ---------------------------------------------------------------------------
function sanitize(value: string): string {
  return value
    .replace(/<[^>]*>/g, "")   // strip HTML tags
    .replace(/ '/g, "'")        // fix scanner artifact: "name 's" → "name's"
    .replace(/ "/g, '"')        // same for double quotes
    .trim();
}

// ---------------------------------------------------------------------------
// In-memory cache (60 s TTL)
// ---------------------------------------------------------------------------
let cachedRows: RawRow[] | null = null;
let cacheExpiry = 0;

/** Call this to force the next fetchAllRows() to hit the Sheets API */
export function clearCache(): void {
  cachedRows = null;
  cacheExpiry = 0;
}

function getAuthClient() {
  const privateKey = (process.env.GOOGLE_PRIVATE_KEY ?? "").replace(
    /\\n/g,
    "\n"
  );
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: privateKey,
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  return auth;
}

function parseRows(rawValues: unknown[][]): RawRow[] {
  // Skip header row if first cell looks like a column label
  const dataRows = rawValues.filter((row, idx) => {
    if (idx === 0) {
      const first = String(row[0] ?? "").toLowerCase().trim();
      if (["timestamp", "date", "time"].includes(first)) return false;
    }
    return true;
  });

  const rows: RawRow[] = [];
  for (const row of dataRows) {
    const [timestamp, city, store, mode, itemName, priceRaw, localRaw] = row as string[];

    // store (col C) is optional — Sell entries are often saved without a store name.
    // Require: timestamp, city, mode, itemName, price.
    if (!timestamp || !city || !mode || !itemName || !priceRaw) continue;

    const price = parseFloat(String(priceRaw).replace(/[^0-9.]/g, ""));
    if (isNaN(price)) continue;

    const modeClean = String(mode).trim();
    if (modeClean !== "Buy" && modeClean !== "Sell") continue;

    const local = String(localRaw ?? "").trim().toLowerCase() === "yes";

    // Default missing store names to "Trading Hub" so they display gracefully
    const storeName = store && String(store).trim() ? sanitize(String(store)) : "Trading Hub";

    rows.push({
      timestamp: sanitize(String(timestamp)),
      city:      sanitize(String(city)),
      store:     storeName,
      mode:      modeClean as "Buy" | "Sell",
      itemName:  sanitize(String(itemName)),
      price,
      local,
    });
  }
  return rows;
}

export async function fetchAllRows(): Promise<RawRow[]> {
  const now = Date.now();
  if (cachedRows && now < cacheExpiry) {
    return cachedRows;
  }

  const auth = getAuthClient();
  const sheets = google.sheets({ version: "v4", auth });
  const sheetId = process.env.GOOGLE_SHEET_ID ?? "";

  // Step 1: get spreadsheet metadata to discover ALL tab names.
  // This means the app works regardless of which tab the OCR scanner writes to.
  const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
  const tabNames = (meta.data.sheets ?? [])
    .map((s) => s.properties?.title)
    .filter(Boolean) as string[];

  if (tabNames.length === 0) {
    cachedRows = [];
    cacheExpiry = now + 60_000;
    return [];
  }

  // Step 2: fetch A:G from every tab in parallel and merge all rows.
  const allRawValues: unknown[][] = [];
  await Promise.all(
    tabNames.map(async (tab) => {
      try {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: sheetId,
          range: `'${tab}'!A:G`,
        });
        const vals = response.data.values ?? [];
        allRawValues.push(...vals);
      } catch {
        // Tab may be empty or have permission issues — skip it silently
      }
    })
  );

  const rows = parseRows(allRawValues);

  cachedRows = rows;
  cacheExpiry = now + 60_000;
  return rows;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns the most-recent entry per city/store/item/mode */
export function getLatestPrices(rows: RawRow[]): PriceEntry[] {
  // Sort ascending by timestamp so later entries overwrite earlier ones
  const sorted = [...rows].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const map = new Map<string, PriceEntry>();
  for (const row of sorted) {
    const key = `${row.city}::${row.store}::${row.itemName}::${row.mode}`;
    map.set(key, row);
  }
  return Array.from(map.values());
}

/** Builds a nested PriceMap from the latest price entries */
export function buildPriceMap(entries: PriceEntry[]): PriceMap {
  const map: PriceMap = {};
  for (const entry of entries) {
    if (!map[entry.itemName]) map[entry.itemName] = {};
    if (!map[entry.itemName][entry.city]) map[entry.itemName][entry.city] = {};
    const existing = map[entry.itemName][entry.city][entry.mode];
    if (
      !existing ||
      new Date(entry.timestamp) > new Date(existing.timestamp)
    ) {
      map[entry.itemName][entry.city][entry.mode] = entry;
    }
  }
  return map;
}

// Preferred display order for cities — west to east along the Silk Road.
// Any city not listed here is appended alphabetically after these.
const CITY_ORDER = ["Tyre", "Damascus", "Palmyra", "Ctesiphon", "Ecbatana"];

export function getAllCities(entries: PriceEntry[]): string[] {
  const found = Array.from(new Set(entries.map((e) => e.city)));
  return found.sort((a, b) => {
    const ai = CITY_ORDER.indexOf(a);
    const bi = CITY_ORDER.indexOf(b);
    // Both known → use preferred order
    if (ai !== -1 && bi !== -1) return ai - bi;
    // One known, one unknown → known comes first
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    // Both unknown → alphabetical
    return a.localeCompare(b);
  });
}

export function getAllItems(entries: PriceEntry[]): string[] {
  return Array.from(new Set(entries.map((e) => e.itemName))).sort();
}

export function ageMinutes(timestamp: string): number {
  // Math.abs guards against timestamps parsed as UTC when written in local time
  // (e.g. BST scanner writes "19:41" → server reads as 19:41 UTC → appears 1h future)
  return Math.abs((Date.now() - new Date(timestamp).getTime()) / 60_000);
}

export function isStale(timestamp: string, thresholdHours = 12): boolean {
  return ageMinutes(timestamp) > thresholdHours * 60;
}

export function formatAge(timestamp: string): string {
  const mins = Math.abs(ageMinutes(timestamp));
  if (mins < 2) return "just now";
  if (mins < 60) return `${Math.round(mins)}m ago`;
  const hrs = mins / 60;
  if (hrs < 24) return `${hrs.toFixed(1)}h ago`;
  return `${(hrs / 24).toFixed(1)}d ago`;
}

/** Compare the two most recent entries per (city, item, mode) to find price changes */
export function computePriceChanges(allRows: RawRow[]): PriceChange[] {
  const groups = new Map<string, RawRow[]>();
  for (const row of allRows) {
    const key = `${row.city}::${row.itemName}::${row.mode}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }

  const changes: PriceChange[] = [];
  for (const rows of groups.values()) {
    if (rows.length < 2) continue;
    const sorted = [...rows].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    const latest = sorted[0];
    const prev   = sorted[1];
    if (latest.price === prev.price) continue;
    changes.push({
      itemName: latest.itemName,
      city:     latest.city,
      mode:     latest.mode,
      oldPrice: prev.price,
      newPrice: latest.price,
      delta:    latest.price - prev.price,
    });
  }

  return changes.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 5);
}
