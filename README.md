# MacroHunter

Find food near you that fits your macros. Set per-meal targets (protein, calories, carbs, fat) and MacroHunter ranks dishes from nearby cafés and restaurants by how well they fit, with honest ranges and a label for how each number was sourced.

This is the first working version. It runs on iPhone, Android and web from one Expo (React Native) codebase, using **sample data for a Surry Hills, Sydney test area** with fictional venues.

## What works now

- **Targets:** per-meal targets with presets (High protein, Lean cut, Low carb, Bulk), saved on the device.
- **Find:** dishes nearby ranked by fit, with an "Only fits" filter and distances from you (or from the sample area centre).
- **Tweaks:** if a simple change makes a dish fit ("skip the chips"), the app says so.
- **Dish details:** macro ranges, targets, the confidence label (Estimated, Venue-verified, Chain-published) and the ingredient breakdown behind the estimate.
- **Venue pages:** every dish at a venue, ranked against your targets.

## How the numbers work

Each dish is stored as ingredients with gram weights (`src/data/venues.ts`). Macros are calculated from a per-100g reference table (`src/lib/nutrition.ts`), so the numbers always come from composition data, not from guessing totals. The range around each number depends on the source: ±3% for chain-published data, ±8% for venue-verified, ±20% for estimates.

The reference table holds approximate values. Before launch, replace it with the FSANZ AUSNUT dataset.

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
src/data/           sample venues and dishes
src/state/          targets, location and ranked results
```

## Next steps

1. Move venues and dishes to Supabase (Postgres + PostGIS) so data can be updated without an app release.
2. Build the menu estimation pipeline: Claude reads a menu and proposes ingredients and portions; macros are computed from AUSNUT.
3. Add Google Places to find real venues, and a map view.
4. Café portal so venues can verify their dishes.
5. Accounts, favourites and "report a wrong number".
