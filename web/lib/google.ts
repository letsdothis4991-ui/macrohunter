/**
 * Google Places API (New). Server-only: the key never reaches the browser.
 * Terms: we keep nothing from Google beyond the place id; ratings and details are
 * fetched fresh for each request and shown with Google attribution.
 */
import "server-only";

import type { Venue, VenueKind } from "./types";

// Overridable only so the end-to-end test can point at a local mock.
const BASE = process.env.GOOGLE_PLACES_BASE_URL || "https://places.googleapis.com/v1";

const PLACE_FIELDS = [
  "id",
  "displayName",
  "shortFormattedAddress",
  "formattedAddress",
  "location",
  "primaryType",
  "types",
  "websiteUri",
  "businessStatus",
  "rating",
  "userRatingCount",
  "googleMapsUri",
  "priceLevel",
  "currentOpeningHours.openNow",
];

export type ApiPlace = {
  id: string;
  displayName?: { text: string };
  shortFormattedAddress?: string;
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  primaryType?: string;
  types?: string[];
  websiteUri?: string;
  businessStatus?: string;
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  priceLevel?: string;
  currentOpeningHours?: { openNow?: boolean };
};

export type VenueFilter = "all" | "cafe" | "restaurant" | "takeaway";

const TYPES_FOR: Record<VenueFilter, string[]> = {
  all: ["restaurant", "cafe", "meal_takeaway", "bakery"],
  cafe: ["cafe", "coffee_shop", "breakfast_restaurant", "brunch_restaurant"],
  restaurant: ["restaurant"],
  takeaway: ["meal_takeaway", "fast_food_restaurant"],
};

export class GoogleError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export function googleKey(): string | null {
  return process.env.GOOGLE_PLACES_API_KEY?.trim() || null;
}

async function call<T>(url: string, init: RequestInit, key: string, fields: string): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": fields,
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`Google Places ${res.status}: ${text}`);
    throw new GoogleError(
      res.status === 403
        ? "Google rejected the API key. Check that Places API (New) is enabled for it."
        : `Google Places returned an error (${res.status}).`,
      res.status,
    );
  }
  return (await res.json()) as T;
}

export async function searchNearby(
  key: string,
  centre: { lat: number; lng: number },
  radiusM: number,
  filter: VenueFilter,
  rank: "DISTANCE" | "POPULARITY",
): Promise<Venue[]> {
  const body = await call<{ places?: ApiPlace[] }>(
    `${BASE}/places:searchNearby`,
    {
      method: "POST",
      body: JSON.stringify({
        includedTypes: TYPES_FOR[filter],
        maxResultCount: 20,
        rankPreference: rank,
        locationRestriction: {
          circle: { center: { latitude: centre.lat, longitude: centre.lng }, radius: radiusM },
        },
      }),
    },
    key,
    PLACE_FIELDS.map((f) => `places.${f}`).join(","),
  );
  return (body.places ?? [])
    .filter((p) => (p.businessStatus ?? "OPERATIONAL") === "OPERATIONAL" && p.location)
    .map(toVenue);
}

export async function placeDetails(key: string, placeId: string): Promise<Venue> {
  const p = await call<ApiPlace>(
    `${BASE}/places/${encodeURIComponent(placeId)}`,
    { method: "GET" },
    key,
    PLACE_FIELDS.join(","),
  );
  return toVenue(p);
}

const PRICE: Record<string, string> = {
  PRICE_LEVEL_INEXPENSIVE: "$",
  PRICE_LEVEL_MODERATE: "$$",
  PRICE_LEVEL_EXPENSIVE: "$$$",
  PRICE_LEVEL_VERY_EXPENSIVE: "$$$$",
};

export function toVenue(p: ApiPlace): Venue {
  return {
    placeId: p.id,
    name: p.displayName?.text ?? "Unnamed venue",
    kind: kindFor(p.primaryType ?? null, p.types ?? []),
    cuisine: cuisineFromType(p.primaryType ?? null),
    address: p.shortFormattedAddress ?? p.formattedAddress ?? "",
    lat: p.location?.latitude ?? 0,
    lng: p.location?.longitude ?? 0,
    rating: p.rating ?? null,
    ratingCount: p.userRatingCount ?? null,
    price: (p.priceLevel && PRICE[p.priceLevel]) || null,
    openNow: p.currentOpeningHours?.openNow ?? null,
    mapsUrl: p.googleMapsUri ?? null,
    website: p.websiteUri ?? null,
  };
}

export function kindFor(primaryType: string | null, types: string[]): VenueKind {
  const all = [primaryType ?? "", ...types];
  if (all.some((t) => /juice|smoothie/.test(t))) return "Juice bar";
  if (primaryType === "bakery") return "Bakery";
  if (primaryType && /cafe|coffee|brunch|breakfast/.test(primaryType)) return "Café";
  if (all.some((t) => /meal_takeaway|fast_food/.test(t))) return "Takeaway";
  if (types.includes("cafe")) return "Café";
  return "Restaurant";
}

/** "korean_restaurant" -> "Korean". Null when the type doesn't name a cuisine. */
export function cuisineFromType(primaryType: string | null): string | null {
  const m = primaryType?.match(/^([a-z_]+)_restaurant$/);
  if (!m || ["fast_food", "fine_dining", "family", "brunch", "breakfast"].includes(m[1])) return null;
  return m[1]
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}
