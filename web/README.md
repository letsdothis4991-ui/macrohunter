# MacroHunter website

A mobile-friendly website for finding food in Sydney that fits your macro targets
(protein, carbs, fat, calories). This is the personal / friends-testing version.

- **Find food:** pick an area, use your location, or tap the map; choose a radius
  (500 m to 5 km). Places, Google ratings, prices and opening hours come live from Google.
- **Venue menus:** opening a venue reads its menu from the venue's website with Claude.
  If that fails, snap the menu, paste it, or give a link. Every dish gets a macro range,
  a fit badge against your targets, and "make it fit" tweaks.
- **Check my plate:** photo and/or description of what you're eating, compared with the
  menu estimate when you start from a dish.
- **My targets:** per-meal targets with presets. Everything is saved in your browser only.

How the numbers are made: Claude picks ingredients and grams; macros are calculated from
the shared ingredient table in `../src/lib/nutrition.ts`, never stated by the model.
The menu prompt lives in `../src/lib/menu-estimate.ts`, shared with the batch pipeline in
`../scripts/ingest`.

## Run it on your computer

```bash
cd web
npm install
cp .env.example .env.local   # then fill in the keys you have
npm run dev                  # http://localhost:3000
```

With no keys it runs in **demo mode**: fictional Surry Hills venues with sample menus, so
you can click through everything except reading real menus and plate checks.

## Put it online for you and a few friends (Vercel, free)

1. Go to vercel.com, sign in with GitHub, and **Add New → Project**. Pick the
   `macrohunter` repo.
2. Set **Root Directory** to `web`. Leave "Include files outside the root directory"
   switched on (the site uses `../src` and `../scripts`). Framework: Next.js.
3. Under **Environment Variables**, add `GOOGLE_PLACES_API_KEY`, `ANTHROPIC_API_KEY` and
   `SITE_PASSWORD` (see `.env.example`). Deploy.
4. Share the URL and the password with friends. Each person's targets, menus and checks
   stay in their own browser.

Vercel's free Hobby plan is for personal, non-commercial use, which fits this test phase.
Before charging anyone or launching publicly, move to a paid plan.

### Getting the keys

- **Google:** console.cloud.google.com → create a project → enable **Places API (New)** →
  APIs & Services → Credentials → Create API key. Restrict the key to "Places API (New)".
  Google needs a billing account (a card), but gives a free monthly allowance per feature.
  Check current prices at mapsplatform.google.com/pricing; light personal use normally
  stays inside it. Set a budget alert in Google Cloud Billing to be safe.
- **Anthropic:** console.anthropic.com → API keys. Pay as you go: add a small credit
  (for example US$10) and set a monthly spend limit under Limits.

### What it costs to run

| Thing | Cost |
| --- | --- |
| Hosting (Vercel Hobby) | Free |
| Google places, ratings, details | Usually inside Google's free monthly allowance for light use |
| Claude: reading a menu | Roughly 10 to 30 US cents, once per venue per browser |
| Claude: plate check | Roughly 2 to 6 US cents each |
| Map tiles (OpenStreetMap) | Free, with attribution, for light use |

`MAX_CLAUDE_CALLS_PER_DAY` (default 150) caps Claude calls per server instance per day.

## Testing without keys

`e2e/mock-server.mjs` stands in for Google Places and the Claude API so the full flow can
be tested for free:

```bash
npm run build
node e2e/mock-server.mjs &   # port 4010
GOOGLE_PLACES_API_KEY=mock GOOGLE_PLACES_BASE_URL=http://127.0.0.1:4010/v1 \
ANTHROPIC_API_KEY=mock ANTHROPIC_BASE_URL=http://127.0.0.1:4010 \
SITE_PASSWORD=letmein npx next start -p 3100 &
node e2e/smoke.cjs           # logs in, searches, reads a pasted menu, checks a plate
npm test && npm run typecheck
```

## UAT checklist

Things worth trying on your phone once it's live:

- [ ] Log in with the password; a wrong password is refused.
- [ ] First visit shows "New here?"; setting targets saves straight away.
- [ ] "Use my location" centres the map on you; the radius chips resize the circle.
- [ ] Pick a few areas (CBD, Newtown, Bondi); tap the map to search somewhere else.
- [ ] Filters (Cafés, Restaurants, Takeaway) and "Most popular first" change the list.
- [ ] Open a venue with a website: the menu reads in under a minute and dishes are ranked.
- [ ] Open a venue with no website: paste a menu, or photograph a printed menu.
- [ ] A dish's details show ingredients, grams, the range and any "make it fit" tweak.
- [ ] Change your targets and see fit badges update on the venue and home pages.
- [ ] "Only places with dishes that fit" hides venues without fits.
- [ ] "Check my plate" from a dish: photo plus a note; the comparison table appears.
- [ ] "Check my plate" on its own with just a description.
- [ ] Recent checks are listed and can be deleted.
- [ ] Dark mode on your phone looks right.
- [ ] Note anything confusing, slow, or numbers that look wrong (with the venue and dish).

## Known limits in this version

- Google returns at most 20 places per search; use a smaller radius or a filter to see others.
- Menus are saved per browser, so each friend reads a venue's menu once on their own phone.
- Menus behind images on a website, or only on Instagram/delivery apps, need a photo or paste.
- Venue verification and lab measurement are planned, not built.
