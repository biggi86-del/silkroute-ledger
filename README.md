# ⚖ SilkRoute Ledger

> **Ancient routes. Modern intelligence.**

A publicly-accessible trading intelligence dashboard for Silk Road merchants. Reads live price data from a Google Sheet (populated by an OCR scanner) and displays it as an interactive web application.

---

## Features

| Page | Description |
|------|-------------|
| `/` | Overview — stat cards, top trade opportunities, recent scans, city freshness |
| `/calculator` | Trade Calculator — compare buy prices between two cities, sorted by profit |
| `/routes` | Trade Routes — all profitable routes, sortable/filterable, stale warnings |
| `/prices` | Price Grid — full item × city matrix with cheapest/priciest highlights |
| `/cities/[name]` | City Pages — buy/sell listings, export/import routes, gold stars on best prices |
| `/coverage` | Coverage — scan freshness grid, scout orders by profit impact |
| `/history` | History — price trends over time via Recharts line charts |

---

## Quick Start

### 1. Clone & install

```bash
git clone https://github.com/yourname/silkroute-ledger.git
cd silkroute-ledger
npm install
```

### 2. Set up Google Sheets API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use an existing one)
3. Enable the **Google Sheets API**
4. Go to **IAM & Admin → Service Accounts** → Create a service account
5. Give it a name, click through, then **Create Key → JSON**
6. Download the JSON key file
7. **Share your Google Sheet** with the service account email (viewer access is enough)

### 3. Configure environment variables

Copy `.env.local.example` to `.env.local` and fill in your values:

```bash
cp .env.local.example .env.local
```

```env
GOOGLE_SHEET_ID=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms
GOOGLE_SERVICE_ACCOUNT_EMAIL=my-scanner@my-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nMIIE...\n-----END RSA PRIVATE KEY-----\n"
```

> **Tip:** When pasting the private key, keep it on one line with `\n` for newlines, surrounded by double quotes.

### 4. Google Sheet format

The sheet should have these columns (with or without a header row):

| A | B | C | D | E | F |
|---|---|---|---|---|---|
| Timestamp | City | Store | Mode | Item Name | Price |

- **Timestamp**: any parseable date string (e.g. `2024-01-15 14:32:00`)
- **City**: e.g. `Tyre`, `Damascus` — auto-detected from data
- **Store**: store name within the city
- **Mode**: exactly `Buy` or `Sell`
- **Item Name**: e.g. `Iron Ingot`
- **Price**: a number (commas and currency symbols are stripped)

New rows should be appended continuously. The app always uses the **most recent** entry per city/store/item/mode combination.

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Deploy to Vercel

### Option A — Vercel CLI

```bash
npx vercel
```

When prompted, add environment variables or paste them in the Vercel dashboard.

### Option B — Vercel Dashboard

1. Push your repo to GitHub
2. Go to [vercel.com/new](https://vercel.com/new) and import the repo
3. Add all environment variables from `.env.local` in the **Environment Variables** section
4. Deploy

> **Important for `GOOGLE_PRIVATE_KEY` on Vercel:** Paste the raw key value (with actual newlines, not `\n` escapes). Vercel handles multiline env vars correctly.

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_SHEET_ID` | ✅ | The ID from your sheet's URL: `docs.google.com/spreadsheets/d/THIS_PART/edit` |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | ✅ | The `client_email` from your service account JSON |
| `GOOGLE_PRIVATE_KEY` | ✅ | The `private_key` from your service account JSON |

---

## Trade Calculator Logic

Profitability is calculated using **Buy price differences across cities only**:

```
Profit per unit = Buy price in destination city − Buy price in source city
```

Example: Iron Ingot costs 33 in Damascus and 40 in Tyre → profit = **+7** per unit buying in Damascus and travelling to Tyre.

---

## Tech Stack

- **Next.js 15** (App Router, TypeScript)
- **Tailwind CSS 4**
- **Recharts** — price history charts
- **googleapis** — Google Sheets API via service account
- **No login required** — publicly accessible

---

## Architecture

```
app/
  page.tsx              # Overview
  calculator/page.tsx   # Trade Calculator
  routes/page.tsx       # Trade Routes
  prices/page.tsx       # Price Grid
  cities/[cityname]/    # Dynamic city pages
  coverage/page.tsx     # Coverage grid
  history/page.tsx      # Price history charts
  api/
    data/route.ts       # Main data endpoint (cached 60s)
    history/route.ts    # Per-item history endpoint

lib/
  sheets.ts             # Google Sheets fetcher + data helpers
  trades.ts             # Trade opportunity computation

types/
  index.ts              # Shared TypeScript types
```

Data is **cached server-side for 60 seconds** to avoid hammering the Sheets API.

---

## Caching

The Google Sheets data is cached in-memory for **60 seconds** per server instance. On Vercel, serverless functions may spin up multiple instances, so each instance maintains its own cache. This is fine for read-heavy dashboards.

If you need a shared cache, replace the in-memory cache in `lib/sheets.ts` with Redis/Upstash.

---

*SilkRoute Ledger — built for traders who prefer data over guesswork.*
