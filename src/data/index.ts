import type { Dish } from "@/lib/matching";

import generated from "./catalogue.json";
import { SAMPLE_CATALOGUE } from "./sample";
import type { Catalogue, Venue } from "./types";

export type { Area, Catalogue, Venue, VenueKind } from "./types";

const real = generated as Catalogue;

/** True while the app is running on the fictional sample data. */
export const IS_SAMPLE_DATA = real.venues.length === 0;

const catalogue: Catalogue = IS_SAMPLE_DATA ? SAMPLE_CATALOGUE : real;

export const AREA = catalogue.area;
export const VENUES = catalogue.venues;
export const DISHES = catalogue.dishes;

export function venueById(id: string): Venue | undefined {
  return VENUES.find((v) => v.id === id);
}

export function dishById(id: string): Dish | undefined {
  return DISHES.find((d) => d.id === id);
}
