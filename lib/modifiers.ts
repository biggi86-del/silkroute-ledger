import "server-only";
import { google } from "googleapis";
import type { CityModifier, ModifierMap } from "@/types";

// ---------------------------------------------------------------------------
// Item → category mapping.
// Keys are lowercase category names that appear in modifier effect text.
// Values are the item names exactly as they appear in the Price column.
// Items not listed here get no modifier bonus (silently skipped).
// ---------------------------------------------------------------------------
const CATEGORY_ITEMS: Record<string, string[]> = {
  food:         ["Wheat", "Barley", "Dried Fish", "Olive Oil", "Sea Salt"],
  agricultural: ["Wheat", "Barley", "Dried Fish", "Olive Oil"],
  luxury:       ["Glassware", "Earthenware", "Silk", "Spices", "Perfume"],
  weapons:      ["Weapons", "Sword", "Bow", "Spear", "Shield"],
  tools:        ["Tools", "Hammer", "Pickaxe", "Saw"],
  metal:        ["Iron Ingot", "Copper Ingot", "Bronze", "Silver", "Gold"],
  textiles:     ["Linen", "Wool", "Leather", "Cotton", "Silk"],
  "trade goods": ["Sea Salt", "Salt"],
  salt:         ["Sea Salt", "Salt"],
};

// Category keywords to match inside effect text (order matters — longer first)
const CATEGORY_KEYWORDS: Array<[string, string]> = [
  ["tools and weapons",  "tools"],
  ["weapons and tools",  "tools"],
  ["tools & weapons",    "tools"],
  ["weapons & tools",    "tools"],
  ["luxury goods",       "luxury"],
  ["trade goods",        "trade goods"],
  ["agricultural",       "agricultural"],
  ["weapons",            "weapons"],
  ["tools",              "tools"],
  ["luxury",             "luxury"],
  ["metal",              "metal"],
  ["iron",               "metal"],
  ["copper",             "metal"],
  ["textiles",           "textiles"],
  ["linen",              "textiles"],
  ["wool",               "textiles"],
  ["leather",            "textiles"],
  ["food",               "food"],
  ["grain",              "food"],
  ["fish",               "food"],
  ["salt",               "salt"],
  ["all goods",          "all"],
  ["all items",          "all"],
  ["everything",         "all"],
];

// Emoji for common modifier names / effect types
const MODIFIER_EMOJI: Array<[RegExp, string]> = [
  [/conflict|war|siege|battle|skirmish/i, "⚔️"],
  [/plague|disease|sickness|epidemic/i,   "☠️"],
  [/festival|celebration|holiday/i,       "🎉"],
  [/drought|famine|scarcity/i,            "🌵"],
  [/flood|storm|disaster/i,               "🌊"],
  [/boom|prosperity|surplus/i,            "📈"],
  [/tax|tariff|duty/i,                    "🏛️"],
  [/ban|embargo|restriction/i,            "🚫"],
];

function pickEmoji(name: string, effectText: string): string {
  const haystack = name + " " + effectText;
  for (const [re, emoji] of MODIFIER_EMOJI) {
    if (re.test(haystack)) return emoji;
  }
  return "📋";
}

// ---------------------------------------------------------------------------
// Parse a single effect-text string into structured data.
// Returns null if we can't extract a meaningful modifier.
// ---------------------------------------------------------------------------
function parseEffectText(
  effectText: string
): { pct: number; direction: 1 | -1; categories: string[] } | null {
  const lower = effectText.toLowerCase();

  // 1. Extract percentage
  const pctMatch = lower.match(/(\d+(?:\.\d+)?)\s*%/);
  let pct = pctMatch ? parseFloat(pctMatch[1]) : 0;

  // Fallback for vague qualifiers
  if (!pct) {
    if (/significantly|greatly|majorly|dramatically/i.test(lower)) pct = 20;
    else if (/moderately|somewhat|notably/i.test(lower)) pct = 10;
    else if (/slightly|minor/i.test(lower)) pct = 5;
    else return null; // no magnitude found
  }

  // 2. Detect direction
  const positiveWords = /bonus|increase|higher|up|boost|more expensive|rise|premium/i;
  const negativeWords = /penalty|decrease|cheaper|cheaper|lower|down|reduce|discount|less expensive|fall/i;

  let direction: 1 | -1;
  if (negativeWords.test(lower)) direction = -1;
  else if (positiveWords.test(lower)) direction = 1;
  else direction = 1; // default to bonus if ambiguous

  // 3. Extract categories
  const categories: string[] = [];
  for (const [keyword, cat] of CATEGORY_KEYWORDS) {
    if (lower.includes(keyword)) {
      if (cat === "all") {
        // "all goods" → add every category
        categories.push(...Object.keys(CATEGORY_ITEMS));
        break;
      }
      if (!categories.includes(cat)) categories.push(cat);
      // Also add related categories for "tools" → also match "weapons" if the phrase is "tools and weapons"
      if (cat === "tools" && lower.includes("weapons") && !categories.includes("weapons")) {
        categories.push("weapons");
      }
      if (cat === "weapons" && lower.includes("tools") && !categories.includes("tools")) {
        categories.push("tools");
      }
    }
  }

  if (categories.length === 0) return null; // can't tell what's affected

  return { pct, direction, categories };
}

// ---------------------------------------------------------------------------
// Resolve which item names are affected by a set of categories
// ---------------------------------------------------------------------------
export function getAffectedItems(categories: string[]): Set<string> {
  const items = new Set<string>();
  for (const cat of categories) {
    for (const item of CATEGORY_ITEMS[cat] ?? []) {
      items.add(item);
    }
  }
  return items;
}

// ---------------------------------------------------------------------------
// Get the combined modifier bonus for a specific item in a specific sell city.
// Returns a multiplier delta e.g. 0.15 means +15% on the sell price.
// ---------------------------------------------------------------------------
export function getModifierBonus(
  itemName: string,
  sellCity: string,
  modifierMap: ModifierMap
): { bonus: number; label: string } {
  const mods = modifierMap[sellCity] ?? [];
  let totalBonus = 0;
  const labels: string[] = [];

  for (const mod of mods) {
    const affected = getAffectedItems(mod.categories);
    if (affected.has(itemName)) {
      const contribution = (mod.pct / 100) * mod.direction;
      totalBonus += contribution;
      const sign = mod.direction > 0 ? "+" : "-";
      labels.push(`${mod.emoji} ${mod.name} (${sign}${mod.pct}%)`);
    }
  }

  return { bonus: totalBonus, label: labels.join(" · ") };
}

// ---------------------------------------------------------------------------
// Fetch and parse the City Modifiers tab from Google Sheets
// ---------------------------------------------------------------------------
let cachedModifiers: ModifierMap | null = null;
let modifierCacheExpiry = 0;

export function clearModifierCache(): void {
  cachedModifiers = null;
  modifierCacheExpiry = 0;
}

export async function fetchModifiers(): Promise<ModifierMap> {
  const now = Date.now();
  if (cachedModifiers && now < modifierCacheExpiry) return cachedModifiers;

  const privateKey = (process.env.GOOGLE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: privateKey,
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  const sheets = google.sheets({ version: "v4", auth });
  const sheetId = process.env.GOOGLE_SHEET_ID ?? "";

  // Find the modifier tab
  const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
  const modTab = (meta.data.sheets ?? []).find((s) => {
    const title = (s.properties?.title ?? "").toLowerCase();
    return title.includes("modif") || title.includes("modifier") || title.includes("event") || title.includes("bonus");
  });

  if (!modTab) {
    cachedModifiers = {};
    modifierCacheExpiry = now + 60_000;
    return {};
  }

  const tabName = modTab.properties?.title ?? "";
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `'${tabName}'!A:Z`,
  });

  const rows = res.data.values ?? [];
  if (rows.length === 0) {
    cachedModifiers = {};
    modifierCacheExpiry = now + 60_000;
    return {};
  }

  // Auto-detect columns:
  // - City column: cell value matches a known city name
  // - Name column: short text that doesn't contain % (modifier title)
  // - Effect column: contains % or bonus/penalty keywords
  const KNOWN_CITIES = new Set(["Tyre", "Damascus", "Palmyra", "Ctesiphon", "Ecbatana"]);
  const EFFECT_RE = /%|bonus|increase|penalty|decrease|cheaper|price|goods/i;

  // Check first non-header row to determine column roles
  const headerRow = rows[0] ?? [];
  const dataRows = rows.slice(1).filter((r) => r.some((c) => String(c ?? "").trim()));

  if (dataRows.length === 0) {
    cachedModifiers = {};
    modifierCacheExpiry = now + 60_000;
    return {};
  }

  // Detect city column — first column where a value matches a known city
  let cityCol = -1;
  let nameCol = -1;
  let effectCol = -1;

  // Try header row for clues
  for (let ci = 0; ci < headerRow.length; ci++) {
    const h = String(headerRow[ci] ?? "").toLowerCase();
    if (h.includes("city") || h.includes("location")) cityCol = ci;
    else if (h.includes("name") || h.includes("event") || h.includes("modifier") || h.includes("title")) nameCol = ci;
    else if (h.includes("effect") || h.includes("description") || h.includes("bonus") || h.includes("text")) effectCol = ci;
  }

  // Fallback: scan data rows to detect columns by content
  if (cityCol === -1 || effectCol === -1) {
    const colScores: Array<{ cityHits: number; effectHits: number }> = [];
    const maxCols = Math.max(...dataRows.map((r) => r.length), 0);
    for (let ci = 0; ci < maxCols; ci++) {
      let cityHits = 0, effectHits = 0;
      for (const row of dataRows) {
        const val = String(row[ci] ?? "").trim();
        if (KNOWN_CITIES.has(val)) cityHits++;
        if (EFFECT_RE.test(val)) effectHits++;
      }
      colScores.push({ cityHits, effectHits });
    }
    if (cityCol === -1) {
      cityCol = colScores.reduce((best, s, i) => s.cityHits > colScores[best].cityHits ? i : best, 0);
    }
    if (effectCol === -1) {
      effectCol = colScores.reduce((best, s, i) => s.effectHits > colScores[best].effectHits ? i : best, 0);
    }
    if (nameCol === -1) {
      // Name column is whichever column is neither city nor effect
      for (let ci = 0; ci < Math.max(...dataRows.map((r) => r.length), 0); ci++) {
        if (ci !== cityCol && ci !== effectCol) { nameCol = ci; break; }
      }
    }
  }

  // Build modifier map
  const modMap: ModifierMap = {};

  for (const row of dataRows) {
    const city = String(row[cityCol] ?? "").trim();
    const name = nameCol >= 0 ? String(row[nameCol] ?? "").trim() : "";
    const effectText = String(row[effectCol] ?? "").trim();

    if (!city || !KNOWN_CITIES.has(city) || !effectText) continue;

    const parsed = parseEffectText(effectText);
    if (!parsed) continue;

    const mod: CityModifier = {
      city,
      name: name || effectText.slice(0, 40),
      effectText,
      pct: parsed.pct,
      direction: parsed.direction,
      categories: parsed.categories,
      emoji: pickEmoji(name, effectText),
    };

    if (!modMap[city]) modMap[city] = [];
    modMap[city].push(mod);
  }

  cachedModifiers = modMap;
  modifierCacheExpiry = now + 60_000;
  return modMap;
}
