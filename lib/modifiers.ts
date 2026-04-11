import "server-only";
import { google } from "googleapis";
import type { CityModifier, ModifierMap } from "@/types";

// ---------------------------------------------------------------------------
// Item → category mapping
// ---------------------------------------------------------------------------
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

// Order matters — longer/more specific phrases first
const CATEGORY_KEYWORDS: Array<[string, string]> = [
  ["tools and weapons",           "tools"],
  ["weapons and tools",           "tools"],
  ["weapons and metal",           "weapons"],
  ["metal and weapons",           "metal"],
  ["tools & weapons",             "tools"],
  ["weapons & tools",             "tools"],
  ["agricultural goods",          "agricultural"],
  ["luxury goods",                "luxury"],
  ["trade goods",                 "trade goods"],
  ["food items",                  "food"],
  ["food goods",                  "food"],
  ["foreign cultures",            "all"],
  ["foreign traders",             "all"],
  ["foreign culture",             "all"],    // singular variant
  ["all goods",                   "all"],
  ["all items",                   "all"],
  ["everything",                  "all"],
  ["agricultural",                "agricultural"],
  ["weapons",                     "weapons"],
  ["tools",                       "tools"],
  ["luxury",                      "luxury"],
  ["metal",                       "metal"],
  ["iron",                        "metal"],
  ["copper",                      "metal"],
  ["textiles",                    "textiles"],
  ["linen",                       "textiles"],
  ["wool",                        "textiles"],
  ["leather",                     "textiles"],
  ["food",                        "food"],
  ["grain",                       "food"],
  ["fish",                        "food"],
  ["salt",                        "salt"],
];

// ---------------------------------------------------------------------------
// Modifier categorisation — by modifier NAME
// Cultural / Language modifiers are display-only, no price effect
// ---------------------------------------------------------------------------
const CULTURAL_KEYWORDS = [
  "culture", "cultural", "religion", "christianity", "christian",
  "jewish", "pagan", "zoroastrian", "muslim",
];
const LANGUAGE_KEYWORDS = [
  "language", "aramaic", "persian language", "native greek",
  "native latin", "arabic language", "greek language",
  "latin language", "coptic", "syriac language",
];

export function getModifierType(name: string): "cultural" | "language" | "economic" {
  const lower = name.toLowerCase();
  if (LANGUAGE_KEYWORDS.some((k) => lower.includes(k))) return "language";
  if (CULTURAL_KEYWORDS.some((k) => lower.includes(k))) return "cultural";
  return "economic";
}

// ---------------------------------------------------------------------------
// OCR text cleanup — applied before parsing
// ---------------------------------------------------------------------------
function cleanEffectText(raw: string): string {
  let t = raw.trim();

  // 1. Strip leading digit(s) + space: "3 This city..." → "This city..."
  t = t.replace(/^\d+\s+/, "");

  // 2. Fix trailing " ' s" or " 's" artifact (ASCII and Unicode apostrophes)
  //    "Homogenous City ' s" → "Homogenous City"
  t = t.replace(/\s+['\u2018\u2019\u02BC]\s*s?\s*$/i, "");

  // 3. Strip trailing isolated digits: "Weapons 9" → "Weapons"
  t = t.replace(/\s+\d+\s*$/, "");

  // 4. Strip trailing OCR noise after last meaningful sentence marker
  //    Only strip if trailing content is short (< 20 chars) and has no digits/%
  const markers = [")", "%", ".", "!", "?"];
  let lastMarkerPos = -1;
  for (const m of markers) {
    const idx = t.lastIndexOf(m);
    if (idx > lastMarkerPos) lastMarkerPos = idx;
  }
  if (lastMarkerPos > 0 && lastMarkerPos < t.length - 1) {
    const trailing = t.slice(lastMarkerPos + 1).trim();
    if (trailing.length < 20 && !/\d/.test(trailing) && !/%/.test(trailing)) {
      t = t.slice(0, lastMarkerPos + 1).trim();
    }
  }

  return t.trim();
}

// ---------------------------------------------------------------------------
// Emoji picker
// ---------------------------------------------------------------------------
const MODIFIER_EMOJI: Array<[RegExp, string]> = [
  [/conflict|war|siege|battle|skirmish/i,       "⚔️"],
  [/plague|disease|sickness|epidemic/i,         "☠️"],
  [/festival|celebration|holiday/i,             "🎉"],
  [/drought|famine|scarcity/i,                  "🌵"],
  [/flood|storm|disaster/i,                     "🌊"],
  [/boom|prosperity|surplus|abundant|harvest/i, "🌾"],
  [/tax|tariff|duty/i,                          "🏛️"],
  [/ban|embargo|restriction/i,                  "🚫"],
  [/port|harbour|harbor|maritime/i,             "⚓"],
  [/capital|imperial|royal/i,                   "👑"],
  [/frontier|border|garrison/i,                 "🛡️"],
  [/desert/i,                                   "🏜️"],
  [/cosmopolitan|diverse|multicultural/i,       "🌍"],
  [/homogenous|homogeneous|isolated/i,          "🏘️"],
  [/culture|cultural/i,                         "🎭"],
  [/language|tongue|dialect/i,                  "📜"],
  [/byzantine/i,                                "🏛️"],
  [/syriac|aramaic|persian/i,                   "📜"],
];

function pickEmoji(name: string, effectText: string): string {
  const haystack = name + " " + effectText;
  for (const [re, emoji] of MODIFIER_EMOJI) {
    if (re.test(haystack)) return emoji;
  }
  return "📋";
}

// ---------------------------------------------------------------------------
// Parse economic effect text → pct, direction, categories
// Returns null if no price effect can be extracted (modifier is display-only)
// ---------------------------------------------------------------------------
function parseEffectText(
  effectText: string
): { pct: number; direction: 1 | -1; categories: string[] } | null {
  const lower = effectText.toLowerCase();

  // 1. Extract percentage — including "(estimate X%)" format
  const pctMatch = lower.match(/(?:estimate\s*[+-]?\s*)?(\d+(?:\.\d+)?)\s*%/);
  let pct = pctMatch ? parseFloat(pctMatch[1]) : 0;

  // Sanity cap: OCR commonly prepends a stray digit, turning "15%" into "115%"
  // If pct > 100, strip the leading digit and retry
  if (pct > 100) {
    const s = String(Math.round(pct));
    const stripped = parseInt(s.slice(1), 10);
    pct = (stripped >= 1 && stripped <= 50) ? stripped : 20;
  }
  // Soft cap: anything above 50% is almost certainly an OCR error
  if (pct > 50) pct = Math.round(pct / 10) * 5 <= 50 ? Math.round(pct / 10) * 5 : 20;

  // Fallback for vague qualifiers when no explicit %
  if (!pct) {
    if (/significantly|greatly|majorly|dramatically/i.test(lower)) pct = 15;
    else if (/moderately|somewhat|notably/i.test(lower)) pct = 10;
    else if (/slightly|minor/i.test(lower)) pct = 5;
    else return null;
  }

  // 2. Direction
  const positiveWords = /bonus|increase|higher|up|boost|more expensive|ris(en|ing|es)|risen|premium|grown/i;
  const negativeWords = /penalty|decrease|cheaper|lower|down|reduc|discount|less expensive|fall|fallen/i;

  let direction: 1 | -1;
  if (negativeWords.test(lower)) direction = -1;
  else if (positiveWords.test(lower)) direction = 1;
  else direction = 1;

  // 3. Categories
  const categories: string[] = [];
  for (const [keyword, cat] of CATEGORY_KEYWORDS) {
    if (lower.includes(keyword)) {
      if (cat === "all") {
        categories.push(...Object.keys(CATEGORY_ITEMS));
        break;
      }
      if (!categories.includes(cat)) categories.push(cat);
      // Compound phrases: "weapons and metal" → both
      if (cat === "weapons" && (lower.includes("metal") || lower.includes("iron") || lower.includes("copper"))) {
        if (!categories.includes("metal")) categories.push("metal");
      }
      if (cat === "metal" && lower.includes("weapons")) {
        if (!categories.includes("weapons")) categories.push("weapons");
      }
      if (cat === "tools" && lower.includes("weapons")) {
        if (!categories.includes("weapons")) categories.push("weapons");
      }
      if (cat === "weapons" && lower.includes("tools")) {
        if (!categories.includes("tools")) categories.push("tools");
      }
    }
  }

  if (categories.length === 0) return null;
  return { pct, direction, categories };
}

// ---------------------------------------------------------------------------
// getAffectedItems — used by profit calculation
// ---------------------------------------------------------------------------
export function getAffectedItems(categories: string[]): Set<string> {
  const items = new Set<string>();
  for (const cat of categories) {
    for (const item of CATEGORY_ITEMS[cat] ?? []) items.add(item);
  }
  return items;
}

// ---------------------------------------------------------------------------
// getModifierBonus — only applies economic modifiers
// ---------------------------------------------------------------------------
export function getModifierBonus(
  itemName: string,
  sellCity: string,
  modifierMap: ModifierMap
): { bonus: number; label: string } {
  const mods = (modifierMap[sellCity] ?? []).filter((m) => m.type === "economic");
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

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------
let cachedModifiers: ModifierMap | null = null;
let modifierCacheExpiry = 0;

export function clearModifierCache(): void {
  cachedModifiers = null;
  modifierCacheExpiry = 0;
}

// ---------------------------------------------------------------------------
// fetchModifiers — reads ALL rows, stores ALL modifiers with type
// ---------------------------------------------------------------------------
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

  const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
  const modTab = (meta.data.sheets ?? []).find((s) => {
    const title = (s.properties?.title ?? "").toLowerCase();
    return title.includes("modif") || title.includes("event") || title.includes("bonus");
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

  const KNOWN_CITIES = new Set(["Tyre", "Damascus", "Palmyra", "Ctesiphon", "Ecbatana"]);
  const EFFECT_RE = /%|bonus|increase|penalty|decrease|cheaper|price|goods|culture|language/i;

  const headerRow = rows[0] ?? [];
  const dataRows = rows.slice(1).filter((r) => r.some((c) => String(c ?? "").trim()));

  if (dataRows.length === 0) {
    cachedModifiers = {};
    modifierCacheExpiry = now + 60_000;
    return {};
  }

  // Auto-detect columns
  let cityCol = -1, nameCol = -1, effectCol = -1;

  for (let ci = 0; ci < headerRow.length; ci++) {
    const h = String(headerRow[ci] ?? "").toLowerCase();
    if (h.includes("city") || h.includes("location"))                                     cityCol   = ci;
    else if (h.includes("name") || h.includes("event") || h.includes("modifier") || h.includes("title")) nameCol   = ci;
    else if (h.includes("effect") || h.includes("description") || h.includes("bonus") || h.includes("text")) effectCol = ci;
  }

  if (cityCol === -1 || effectCol === -1) {
    const maxCols = Math.max(...dataRows.map((r) => r.length), 0);
    const colScores = Array.from({ length: maxCols }, () => ({ cityHits: 0, effectHits: 0 }));
    for (const row of dataRows) {
      for (let ci = 0; ci < row.length; ci++) {
        const val = String(row[ci] ?? "").trim();
        if (KNOWN_CITIES.has(val)) colScores[ci].cityHits++;
        if (EFFECT_RE.test(val))   colScores[ci].effectHits++;
      }
    }
    if (cityCol   === -1) cityCol   = colScores.reduce((b, s, i) => s.cityHits   > colScores[b].cityHits   ? i : b, 0);
    if (effectCol === -1) effectCol = colScores.reduce((b, s, i) => s.effectHits > colScores[b].effectHits ? i : b, 0);
    if (nameCol   === -1) {
      for (let ci = 0; ci < maxCols; ci++) {
        if (ci !== cityCol && ci !== effectCol) { nameCol = ci; break; }
      }
    }
  }

  const modMap: ModifierMap = {};

  for (const row of dataRows) {
    // Fuzzy city match — OCR may append digits or punctuation to city names
    const rawCity = String(row[cityCol] ?? "").trim().replace(/[\d\s'.,:;!?]+$/, "").trim();
    const city = Array.from(KNOWN_CITIES).find(
      (c) => c.toLowerCase() === rawCity.toLowerCase() || rawCity.startsWith(c)
    ) ?? "";
    if (!city) continue;

    const rawName   = nameCol >= 0 ? String(row[nameCol]  ?? "").trim() : "";
    const rawEffect = String(row[effectCol] ?? "").trim();

    // Clean OCR noise from the effect text
    const effectText = cleanEffectText(rawEffect || rawName);
    const name       = cleanEffectText(rawName) || effectText.slice(0, 40);

    if (!name && !effectText) continue;

    // Determine modifier type by name
    const type = getModifierType(name);

    // Economic modifiers: parse price effect
    let pct = 0;
    let direction: 1 | -1 = 1;
    let categories: string[] = [];

    if (type === "economic") {
      const parsed = parseEffectText(effectText);
      if (parsed) {
        pct        = parsed.pct;
        direction  = parsed.direction;
        categories = parsed.categories;
      }
      // If we can't parse the economic effect, still store it — just with pct=0
      // so it shows in the UI but doesn't affect calculations
    }

    const mod: CityModifier = {
      city,
      name,
      effectText,
      pct,
      direction,
      categories,
      emoji: pickEmoji(name, effectText),
      type,
    };

    if (!modMap[city]) modMap[city] = [];
    modMap[city].push(mod);
  }

  cachedModifiers = modMap;
  modifierCacheExpiry = now + 60_000;
  return modMap;
}
