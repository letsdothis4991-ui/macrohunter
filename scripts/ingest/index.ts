/**
 * Builds src/data/catalogue.json from real venues:
 *   1. find cafés and restaurants in the area (Google Places)
 *   2. find each venue's menu (manual files first, then the venue's website)
 *   3. estimate every dish's ingredients and grams with Claude
 *   4. write the catalogue the app loads, plus a CSV for spot-checking
 *
 * Every step caches its results under data/ingest/, so re-running only does new work.
 * Run `npm run ingest -- --help` for options.
 */
import Anthropic from "@anthropic-ai/sdk";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";

import type { Area } from "../../src/data/types";
import { buildCatalogue, reportCsv, type VenueResult } from "./catalogue";
import {
  cleanEstimate,
  estimateMenu,
  MODEL,
  type MenuEstimate,
  type Rejected,
} from "./estimate";
import { findMenu } from "./menu";
import { discoverPlaces, type Place } from "./places";
import { mapPool, readJson, safeId, slugify, writeJson } from "./util";

const ROOT = path.resolve(import.meta.dirname, "../..");
const DATA = path.join(ROOT, "data/ingest");
const CATALOGUE_FILE = path.join(ROOT, "src/data/catalogue.json");

const HELP = `Usage: npm run ingest -- [options]

  --area <name>        Area name shown in the app (default from data/ingest/area.json)
  --lat <n> --lng <n>  Centre of the area
  --radius-km <n>      Search radius in km
  --max-venues <n>     Only process the nearest N venues (default 40)
  --refresh-places     Search Google Places again instead of using the cached list
  --refresh-estimates  Re-run Claude on venues that already have an estimate
  --skip-estimates     Don't call Claude; build from cached estimates only
  --help               Show this help

Needs GOOGLE_PLACES_API_KEY (for venue search) and ANTHROPIC_API_KEY (for menu
estimates) in the environment. Put menus you collect yourself in
data/ingest/manual-menus/ named after the venue (see README).`;

type CachedMenuResult = {
  placeId: string;
  menuSource: string | null;
  estimate: MenuEstimate | null;
  error?: string;
  at: string;
};

async function main() {
  const { values: args } = parseArgs({
    options: {
      area: { type: "string" },
      lat: { type: "string" },
      lng: { type: "string" },
      "radius-km": { type: "string" },
      "max-venues": { type: "string", default: "40" },
      "refresh-places": { type: "boolean", default: false },
      "refresh-estimates": { type: "boolean", default: false },
      "skip-estimates": { type: "boolean", default: false },
      help: { type: "boolean", default: false },
    },
  });
  if (args.help) return console.log(HELP);

  const saved = await readJson<Area>(path.join(DATA, "area.json"));
  const area: Area = {
    name: args.area ?? saved?.name ?? "Surry Hills",
    lat: Number(args.lat ?? saved?.lat ?? -33.8866),
    lng: Number(args.lng ?? saved?.lng ?? 151.2115),
    radiusKm: Number(args["radius-km"] ?? saved?.radiusKm ?? 0.8),
  };
  if (![area.lat, area.lng, area.radiusKm].every(Number.isFinite))
    throw new Error("--lat, --lng and --radius-km must be numbers");
  await writeJson(path.join(DATA, "area.json"), area);
  const maxVenues = Number(args["max-venues"]);

  // 1. Venues
  const placesFile = path.join(DATA, "places.json");
  let places = args["refresh-places"]
    ? null
    : await readJson<Place[]>(placesFile);
  if (!places) {
    const key = process.env.GOOGLE_PLACES_API_KEY;
    if (!key)
      throw new Error("Set GOOGLE_PLACES_API_KEY to search for venues.");
    places = await discoverPlaces(area, area.radiusKm, key, console.log);
    await writeJson(placesFile, places);
  }
  places = places.slice(0, maxVenues);
  console.log(`${places.length} venues in ${area.name}.`);

  // 2 + 3. Menus and estimates, cached per venue
  const client = args["skip-estimates"] ? null : new Anthropic();
  const rejectedAll: (Rejected & { venue: string })[] = [];
  const noMenu: Place[] = [];
  const failed: { place: Place; error: string }[] = [];

  const results = await mapPool(
    places,
    4,
    async (place): Promise<VenueResult | null> => {
      const cacheFile = path.join(
        DATA,
        "estimates",
        `${safeId(place.placeId)}.json`,
      );
      let cached = await readJson<CachedMenuResult>(cacheFile);
      const stale =
        !cached ||
        args["refresh-estimates"] ||
        (cached.error && !cached.estimate);
      if (stale && client) {
        const menu = await findMenu(place, path.join(DATA, "manual-menus"), [
          place.placeId,
          slugify(place.name),
        ]);
        if (!menu) {
          cached = {
            placeId: place.placeId,
            menuSource: null,
            estimate: null,
            at: new Date().toISOString(),
          };
        } else {
          try {
            console.log(`Reading menu: ${place.name}`);
            const estimate = await estimateMenu(client, place.name, menu);
            cached = {
              placeId: place.placeId,
              menuSource: menu.source,
              estimate,
              at: new Date().toISOString(),
            };
          } catch (e) {
            cached = {
              placeId: place.placeId,
              menuSource: menu.source,
              estimate: null,
              error: String(e),
              at: new Date().toISOString(),
            };
          }
        }
        await writeJson(cacheFile, cached);
      }
      if (!cached) return null;
      if (cached.error) failed.push({ place, error: cached.error });
      if (!cached.menuSource || (cached.estimate && !cached.estimate.menuFound))
        noMenu.push(place);
      if (!cached.estimate?.menuFound) return null;
      const { dishes, rejected } = cleanEstimate(cached.estimate);
      rejectedAll.push(...rejected.map((r) => ({ ...r, venue: place.name })));
      return {
        place,
        menuSource: cached.menuSource!,
        cuisine: cached.estimate.cuisine,
        dishes,
      };
    },
  );

  // 4. Catalogue + report
  const catalogue = buildCatalogue(
    area,
    results.filter((r): r is VenueResult => r != null),
    new Date().toISOString(),
  );
  await writeJson(CATALOGUE_FILE, catalogue);
  await writeFile(path.join(DATA, "report.csv"), reportCsv(catalogue));
  await writeJson(path.join(DATA, "needs-attention.json"), {
    noMenuFound: noMenu.map((p) => ({
      name: p.name,
      placeId: p.placeId,
      website: p.website,
      manualMenuName: slugify(p.name),
    })),
    failed: failed.map((f) => ({ name: f.place.name, error: f.error })),
    rejectedDishes: rejectedAll,
  });

  console.log(
    [
      "",
      `Catalogue: ${catalogue.venues.length} venues, ${catalogue.dishes.length} dishes (model ${MODEL}).`,
      `No menu found for ${noMenu.length} venues; ${failed.length} failed; ${rejectedAll.length} dishes left out.`,
      "Details: data/ingest/needs-attention.json. Spot-check numbers in data/ingest/report.csv.",
    ].join("\n"),
  );
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
