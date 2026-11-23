/**
 * Demo mode: the fictional Surry Hills venues from the phone app's sample data, used
 * when no Google key is set up so the site can still be tried end to end.
 */
import { SAMPLE_CATALOGUE } from "@/data/sample";
import { distanceKm } from "@/lib/geo";

import type { Venue, VenueMenu } from "./types";

export const DEMO_PREFIX = "demo-";

export function isDemoId(placeId: string): boolean {
  return placeId.startsWith(DEMO_PREFIX);
}

export const DEMO_VENUES: Venue[] = SAMPLE_CATALOGUE.venues.map((v) => ({
  placeId: DEMO_PREFIX + v.id,
  name: v.name,
  kind: v.kind,
  cuisine: v.cuisine,
  address: v.address,
  lat: v.lat,
  lng: v.lng,
  rating: null,
  ratingCount: null,
  price: null,
  openNow: null,
  mapsUrl: null,
  website: null,
  demo: true,
}));

export function demoVenuesNear(centre: { lat: number; lng: number }, radiusM: number): Venue[] {
  return DEMO_VENUES.filter((v) => distanceKm(centre, v) * 1000 <= radiusM).sort(
    (a, b) => distanceKm(centre, a) - distanceKm(centre, b),
  );
}

export function demoVenue(placeId: string): Venue | null {
  return DEMO_VENUES.find((v) => v.placeId === placeId) ?? null;
}

export function demoMenu(placeId: string): VenueMenu | null {
  const id = placeId.slice(DEMO_PREFIX.length);
  const venue = SAMPLE_CATALOGUE.venues.find((v) => v.id === id);
  if (!venue) return null;
  return {
    placeId,
    venueName: venue.name,
    source: { kind: "demo" },
    readAt: new Date(0).toISOString(),
    cuisine: venue.cuisine,
    confidence: venue.confidence,
    dishes: SAMPLE_CATALOGUE.dishes.filter((d) => d.venueId === id),
    skipped: [],
  };
}
