import { NextResponse } from "next/server";

import { demoVenue, isDemoId } from "~/lib/demo";
import { googleKey, placeDetails } from "~/lib/google";

import { fail, handleError } from "../../_shared";

export async function GET(_req: Request, ctx: RouteContext<"/api/venue/[placeId]">) {
  const { placeId } = await ctx.params;
  if (isDemoId(placeId)) {
    const venue = demoVenue(placeId);
    return venue ? NextResponse.json({ venue }) : fail(404, "Venue not found.");
  }
  const key = googleKey();
  if (!key) return fail(503, "Google isn't set up yet, so real venues can't be loaded.", "no_google");
  try {
    return NextResponse.json({ venue: await placeDetails(key, placeId) });
  } catch (err) {
    return handleError(err);
  }
}
