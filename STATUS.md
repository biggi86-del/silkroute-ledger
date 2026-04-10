# SilkRoute Ledger — Build Status

## Phase 1 Complete: Full Application Build

### Pages Delivered
| Route | Status | Notes |
|-------|--------|-------|
| `/` | ✅ | Stat cards, top 5 trades, recent scans, city freshness panel |
| `/calculator` | ✅ | City dropdowns, profit table, best trade card |
| `/routes` | ✅ | Sortable/filterable table, stale warnings |
| `/prices` | ✅ | Item × city matrix, cheapest/priciest borders, hover tooltips |
| `/cities/[cityname]` | ✅ | Dynamic city pages, buy/sell tables, export/import routes, gold stars, 404 handling |
| `/coverage` | ✅ | Freshness grid, scout orders by profit impact |
| `/history` | ✅ | Item dropdown, Recharts line chart (solid buy/dashed sell), parchment tooltip, raw data table |

### API Routes
| Route | Status | Notes |
|-------|--------|-------|
| `GET /api/data` | ✅ | Returns stats, trades, freshness, priceMap, cities, items, recentActivity |
| `GET /api/history?item=X` | ✅ | Returns all rows for a given item, sorted ascending |

### Build Results
- **TypeScript**: 0 errors
- **CSS warnings**: 0 (import order fixed)
- **Build time**: ~16s
- **All 9 routes**: compiled successfully
- **Auth**: Removed — app is publicly accessible (no login required)

### Architecture Decisions
- No authentication — publicly open per user request
- Google credentials stay server-side only (env vars, never exposed to browser)
- 60-second in-memory cache on sheet data to prevent API abuse
- Trade profit = Buy price in destination − Buy price in source city (Buy-mode only)
- Cities auto-detected from data — never hardcoded
- Latest price = most recent timestamp per city/store/item/mode key

### Environment Variables Required
```
GOOGLE_SHEET_ID=
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=
```

### Deployment
See README.md for full Vercel deployment instructions.

### Issues Resolved
- CSS `@import` ordering warning fixed (Google Fonts import moved before Tailwind)
- TypeScript strict mode — all types correctly defined in `types/index.ts`
- Dynamic city pages use `use(params)` for Next.js 15 async params API

### QA Notes
- The app gracefully handles empty sheet data (shows "no data" states on all pages)
- Stale data (>12h) is flagged on routes and city pages
- Coverage page shows scout priority order based on potential profit impact
- All tables have responsive horizontal scroll wrappers
- City pages 404 with a styled "Unknown City" message (not a hard 404)
