import type { Area, Catalogue, Venue } from "../../src/data/types";
import type { Dish } from "../../src/lib/matching";
import { macrosFor } from "../../src/lib/nutrition";
import type { CleanDish } from "./estimate";
import { cuisineFromType, kindFor, type Place } from "./places";
import { safeId, slugify } from "./util";

export type VenueResult = {
  place: Place;
  menuSource: string;
  cuisine: string;
  dishes: CleanDish[];
};

export function venueId(place: Place): string {
  return `${slugify(place.name) || "venue"}-${safeId(place.placeId).slice(-6).toLowerCase()}`;
}

export function buildCatalogue(
  area: Area,
  results: VenueResult[],
  generatedAt: string,
): Catalogue {
  const venues: Venue[] = [];
  const dishes: Dish[] = [];
  for (const r of results) {
    if (!r.dishes.length) continue;
    const id = venueId(r.place);
    venues.push({
      id,
      name: r.place.name,
      kind: kindFor(r.place),
      cuisine: cuisineFromType(r.place.primaryType) ?? r.cuisine,
      address: r.place.address,
      lat: r.place.lat,
      lng: r.place.lng,
      confidence: "estimated",
      placeId: r.place.placeId,
      ...(r.place.website ? { website: r.place.website } : {}),
      menuSource: r.menuSource,
    });
    const used = new Set<string>();
    for (const d of r.dishes) {
      let dishId = `${id}-${slugify(d.name) || "dish"}`;
      for (let n = 2; used.has(dishId); n++)
        dishId = `${id}-${slugify(d.name)}-${n}`;
      used.add(dishId);
      dishes.push({
        id: dishId,
        venueId: id,
        name: d.name,
        description: d.description,
        priceAud: d.priceAud,
        portions: d.portions,
        ...(d.tweaks.length ? { tweaks: d.tweaks } : {}),
      });
    }
  }
  return { version: 1, generatedAt, area, venues, dishes };
}

/** One row per dish, for spot-checking estimates in a spreadsheet. */
export function reportCsv(catalogue: Catalogue): string {
  const esc = (v: string | number | null) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const venues = new Map(catalogue.venues.map((v) => [v.id, v]));
  const rows = [
    [
      "venue",
      "dish",
      "price_aud",
      "kcal",
      "protein_g",
      "carbs_g",
      "fat_g",
      "ingredients",
      "menu_source",
    ],
  ];
  for (const d of catalogue.dishes) {
    const m = macrosFor(d.portions);
    const v = venues.get(d.venueId);
    rows.push([
      v?.name ?? d.venueId,
      d.name,
      d.priceAud == null ? "" : String(d.priceAud),
      String(m.calories),
      String(m.protein),
      String(m.carbs),
      String(m.fat),
      d.portions.map((p) => `${p.ingredient} ${p.grams}g`).join("; "),
      v?.menuSource ?? "",
    ]);
  }
  return rows.map((r) => r.map(esc).join(",")).join("\n") + "\n";
}
