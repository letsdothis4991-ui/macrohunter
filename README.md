# MacroHunter

Find food near you that fits your macros. Set per-meal targets (protein, calories, carbs, fat) and MacroHunter ranks dishes from nearby cafés and restaurants by how well they fit, with honest ranges and a label for how each number was sourced.

It runs on iPhone, Android and web from one Expo (React Native) codebase. Until you generate a real catalogue (below), it shows **fictional sample venues in Surry Hills, Sydney**.

## What works now

- **Targets:** per-meal targets with presets (High protein, Lean cut, Low carb, Bulk), saved on the device.
- **Find:** dishes nearby ranked by fit, with an "Only fits" filter and distances from you (or from the sample area centre).
- **Tweaks:** if a simple change makes a dish fit ("skip the chips"), the app says so.
- **Dish details:** macro ranges, targets, the confidence label (Estimated, Venue-verified, Chain-published) and the ingredient breakdown behind the estimate.
- **Venue pages:** every dish at a venue, ranked against your targets.

## How the numbers work

Each dish is stored as ingredients with gram weights (`src/data/venues.ts`). Macros are calculated from a per-100g reference table (`src/lib/nutrition.ts`), so the numbers always come from composition data, not from guessing totals. The range around each number depends on the source: ±3% for chain-published data, ±8% for venue-verified, ±20% for estimates.

The reference table holds approximate values. Before launch, replace it with the FSANZ AUSNUT dataset.

## Real venues and menus

`npm run ingest` builds `src/data/catalogue.json` from real cafés and restaurants:

1. **Find venues** in an area with the Google Places API (cafés, restaurants, takeaways, bakeries).
2. **Find each menu**: a file you added to `data/ingest/manual-menus/` first, otherwise the venue's own website (the home page, menu pages and menu PDFs). Delivery apps are not used, because their terms forbid scraping.
3. **Estimate each dish** with Claude: it reads the menu (text, PDFs or photos) and lists every dish's ingredients and grams, picked from the ingredient table. The app then calculates macros from the table, so the numbers never come from the model directly. Vague dishes ("chef's special") and implausible portions are left out.
4. **Write the catalogue** the app loads, plus `data/ingest/report.csv` for spot-checking and `data/ingest/needs-attention.json` listing venues with no menu found.

### Setup

You need two API keys, set as environment variables (never commit them):

| Variable | What for | Where to get it |
| --- | --- | --- |
| `GOOGLE_PLACES_API_KEY` | Venue search | Google Cloud console: enable **Places API (New)**, then create an API key |
| `ANTHROPIC_API_KEY` | Reading menus | [Claude Console](https://console.anthropic.com) → API keys |

```bash
export GOOGLE_PLACES_API_KEY=...
export ANTHROPIC_API_KEY=...
npm run ingest -- --area "Surry Hills" --lat -33.8866 --lng 151.2115 --radius-km 0.8 --max-venues 40
```

Re-running is cheap: venue search results and each venue's estimate are cached in `data/ingest/`, so only new venues are processed. Use `--refresh-estimates` to re-read every menu, or `--help` for all options. Commit `data/ingest/` and `src/data/catalogue.json` to keep the results.

**Rough cost:** Google Places charges per search request (the area is covered with ~10 to 30 small searches; check Google's current pricing and free monthly allowance). Claude costs roughly A$0.20 to A$1 per venue depending on menu length, so about A$10 to A$40 for 40 venues.

**Before showing real users,** open `report.csv`, check a sample of dishes against what you'd expect (or weigh a few meals), and fix anything badly off by adding a clearer menu file and re-running.

## Run it

You need [Node.js](https://nodejs.org) 20 or later.

```bash
npm install
npx expo start
```

Then scan the QR code with the **Expo Go** app on your phone, or press `w` to open it in a browser.

## Checks

```bash
npm test           # unit tests for the macro maths and matching
npm run typecheck
npx expo lint
```

## Project layout

```
src/app/            screens (Expo Router): find list, targets, dish, venue
src/components/     dish card, badges
src/lib/            nutrition maths, matching and ranking, distance
src/data/           generated catalogue, sample venues, data types
scripts/ingest/     venue search, menu fetching, Claude estimates
data/ingest/        ingest cache, manual menus, spot-check report
src/state/          targets, location and ranked results
```

## Next steps

1. Replace the approximate ingredient table with the FSANZ AUSNUT dataset.
2. Move the catalogue to Supabase (Postgres + PostGIS) so data updates without an app release.
3. Map view.
4. Café portal so venues can verify their dishes.
5. Accounts, favourites and "report a wrong number".
