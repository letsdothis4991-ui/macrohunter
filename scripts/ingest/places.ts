/**
 * Venue discovery with Google Places API (New), Nearby Search.
 * https://developers.google.com/maps/documentation/places/web-service/nearby-search
 *
 * Nearby Search returns at most 20 places per call, so the area is covered with a
 * grid of small overlapping circles and the results are de-duplicated.
 */
import type { VenueKind } from "../../src/data/types";
import { distanceKm, type LatLng } from "../../src/lib/geo";

export type Place = {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  primaryType: string | null;
  types: string[];
  website: string | null;
};

const ENDPOINT = "https://places.googleapis.com/v1/places:searchNearby";

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.shortFormattedAddress",
  "places.formattedAddress",
  "places.location",
  "places.primaryType",
  "places.types",
  "places.websiteUri",
  "places.businessStatus",
].join(",");

/** Place types we search for. All are in Google's Table A, so they can be used as filters. */
const INCLUDED_TYPES = ["restaurant", "cafe", "meal_takeaway", "bakery"];

type ApiPlace = {
  id: string;
  displayName?: { text: string };
  shortFormattedAddress?: string;
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  primaryType?: string;
  types?: string[];
  websiteUri?: string;
  businessStatus?: string;
};

/** Centres of circles of radius `cellKm` that together cover a circle of `radiusKm`. */
export function coveringCircles(
  centre: LatLng,
  radiusKm: number,
  cellKm: number,
): LatLng[] {
  if (radiusKm <= cellKm) return [centre];
  // Hex-ish grid: spacing of cellKm * sqrt(2) keeps every point within cellKm of a centre.
  const step = cellKm * Math.SQRT2;
  const kmPerDegLat = 110.574;
  const kmPerDegLng = 111.32 * Math.cos((centre.lat * Math.PI) / 180);
  const n = Math.ceil(radiusKm / step);
  const points: LatLng[] = [];
  for (let i = -n; i <= n; i++) {
    for (let j = -n; j <= n; j++) {
      const p = {
        lat: centre.lat + (i * step) / kmPerDegLat,
        lng: centre.lng + (j * step) / kmPerDegLng,
      };
      if (distanceKm(centre, p) <= radiusKm + cellKm) points.push(p);
    }
  }
  return points;
}

export async function searchNearby(
  centre: LatLng,
  radiusM: number,
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Place[]> {
  const res = await fetchImpl(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify({
      includedTypes: INCLUDED_TYPES,
      maxResultCount: 20,
      rankPreference: "DISTANCE",
      locationRestriction: {
        circle: {
          center: { latitude: centre.lat, longitude: centre.lng },
          radius: radiusM,
        },
      },
    }),
  });
  if (!res.ok) {
    throw new Error(
      `Places search failed (${res.status}): ${await res.text()}`,
    );
  }
  const body = (await res.json()) as { places?: ApiPlace[] };
  return (body.places ?? [])
    .filter(
      (p) =>
        (p.businessStatus ?? "OPERATIONAL") === "OPERATIONAL" && p.location,
    )
    .map((p) => ({
      placeId: p.id,
      name: p.displayName?.text ?? "Unnamed venue",
      address: p.shortFormattedAddress ?? p.formattedAddress ?? "",
      lat: p.location!.latitude,
      lng: p.location!.longitude,
      primaryType: p.primaryType ?? null,
      types: p.types ?? [],
      website: p.websiteUri ?? null,
    }));
}

/** Searches the whole area and returns unique places, nearest to the centre first. */
export async function discoverPlaces(
  centre: LatLng,
  radiusKm: number,
  apiKey: string,
  log: (msg: string) => void = () => {},
  fetchImpl: typeof fetch = fetch,
): Promise<Place[]> {
  const cellKm = 0.3;
  const circles = coveringCircles(centre, radiusKm, cellKm);
  log(`Searching ${circles.length} spots across ${radiusKm} km…`);
  const byId = new Map<string, Place>();
  for (const c of circles) {
    for (const p of await searchNearby(c, cellKm * 1000, apiKey, fetchImpl)) {
      if (distanceKm(centre, p) <= radiusKm) byId.set(p.placeId, p);
    }
  }
  return [...byId.values()].sort(
    (a, b) => distanceKm(centre, a) - distanceKm(centre, b),
  );
}

export function kindFor(
  place: Pick<Place, "primaryType" | "types">,
): VenueKind {
  const types = [place.primaryType ?? "", ...place.types];
  if (types.some((t) => /juice|smoothie/.test(t))) return "Juice bar";
  if (
    place.primaryType &&
    /cafe|coffee|bakery|brunch|breakfast/.test(place.primaryType)
  )
    return "Café";
  if (types.some((t) => /meal_takeaway|fast_food/.test(t))) return "Takeaway";
  if (types.includes("cafe")) return "Café";
  return "Restaurant";
}

/** "korean_restaurant" -> "Korean". Null when the type doesn't name a cuisine. */
export function cuisineFromType(primaryType: string | null): string | null {
  const m = primaryType?.match(/^([a-z_]+)_restaurant$/);
  if (!m || ["fast_food", "fine_dining", "family"].includes(m[1])) return null;
  return m[1]
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}
