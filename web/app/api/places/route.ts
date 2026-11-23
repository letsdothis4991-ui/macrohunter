import { NextResponse, type NextRequest } from "next/server";

import { demoVenuesNear } from "~/lib/demo";
import { googleKey, searchNearby, type VenueFilter } from "~/lib/google";

import { fail, handleError } from "../_shared";

const FILTERS: VenueFilter[] = ["all", "cafe", "restaurant", "takeaway"];

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const lat = Number(q.get("lat"));
  const lng = Number(q.get("lng"));
  const radius = Math.min(Math.max(Number(q.get("radius")) || 1000, 100), 10_000);
  const filter = (FILTERS.includes(q.get("filter") as VenueFilter) ? q.get("filter") : "all") as VenueFilter;
  const rank = q.get("rank") === "popular" ? "POPULARITY" : "DISTANCE";
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return fail(400, "A valid location is needed.");
  }

  const key = googleKey();
  if (!key) return NextResponse.json({ venues: demoVenuesNear({ lat, lng }, radius), demo: true });
  try {
    const venues = await searchNearby(key, { lat, lng }, radius, filter, rank);
    return NextResponse.json({ venues, demo: false });
  } catch (err) {
    return handleError(err);
  }
}
