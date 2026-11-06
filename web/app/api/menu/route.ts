import { NextResponse } from "next/server";
import { z } from "zod";

import type { Dish } from "@/lib/matching";

import { claudeConfigured, loadMenu, type MenuInput, readMenu } from "~/lib/claude";
import { demoMenu, isDemoId } from "~/lib/demo";
import { googleKey, placeDetails } from "~/lib/google";
import { slug } from "~/lib/macros";
import { publicHttpUrl } from "~/lib/safe-url";
import type { MenuSource, VenueMenu } from "~/lib/types";

import { fail, handleError, isImageType, MAX_IMAGE_BASE64 } from "../_shared";

// Reading a long menu takes Claude up to a couple of minutes.
export const maxDuration = 300;

const Body = z.object({
  placeId: z.string().min(1).max(300),
  venueName: z.string().min(1).max(200),
  source: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("website") }),
    z.object({ kind: z.literal("link"), url: z.string().max(2000) }),
    z.object({ kind: z.literal("pasted"), text: z.string().max(80_000) }),
    z.object({
      kind: z.literal("photos"),
      images: z
        .array(z.object({ mediaType: z.string(), base64: z.string().max(MAX_IMAGE_BASE64) }))
        .min(1)
        .max(6),
    }),
  ]),
});

export async function POST(req: Request) {
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return fail(400, "That request didn't look right.");
  }
  const { placeId, venueName, source } = body;

  if (isDemoId(placeId)) {
    const menu = demoMenu(placeId);
    return menu ? NextResponse.json({ menu }) : fail(404, "Venue not found.");
  }
  if (!claudeConfigured()) {
    return fail(503, "Claude isn't set up yet, so menus can't be read. Add ANTHROPIC_API_KEY.", "no_claude");
  }

  try {
    let input: MenuInput;
    let menuSource: MenuSource;
    if (source.kind === "website") {
      // Look the website up ourselves rather than trusting the browser.
      const key = googleKey();
      if (!key) return fail(503, "Google isn't set up yet.", "no_google");
      const venue = await placeDetails(key, placeId);
      const url = venue.website && publicHttpUrl(venue.website);
      if (!url) return fail(422, "Google doesn't list a website for this venue.", "no_website");
      input = { kind: "website", url: url.toString() };
      menuSource = { kind: "website", url: url.toString() };
    } else if (source.kind === "link") {
      const url = publicHttpUrl(source.url);
      if (!url) return fail(400, "That link doesn't look like a public web page.");
      input = { kind: "link", url: url.toString() };
      menuSource = { kind: "link", url: url.toString() };
    } else if (source.kind === "pasted") {
      input = { kind: "pasted", text: source.text };
      menuSource = { kind: "pasted" };
    } else {
      const images = [];
      for (const img of source.images) {
        if (!isImageType(img.mediaType)) return fail(400, "Photos need to be JPEG, PNG, WebP or GIF.");
        images.push({ mediaType: img.mediaType, base64: img.base64 });
      }
      input = { kind: "photos", images };
      menuSource = { kind: "photos", count: images.length };
    }

    const loaded = await loadMenu(input);
    const read = await readMenu(venueName, loaded);
    const used = new Set<string>();
    const dishes: Dish[] = read.dishes.map((d) => {
      let id = `${slug(d.name)}`;
      for (let n = 2; used.has(id); n++) id = `${slug(d.name)}-${n}`;
      used.add(id);
      return {
        id,
        venueId: placeId,
        name: d.name,
        description: d.description,
        priceAud: d.priceAud,
        portions: d.portions,
        tweaks: d.tweaks,
      };
    });
    const menu: VenueMenu = {
      placeId,
      venueName,
      source: menuSource,
      readAt: new Date().toISOString(),
      cuisine: read.cuisine,
      confidence: "estimated",
      dishes,
      skipped: read.skipped,
    };
    return NextResponse.json({ menu });
  } catch (err) {
    return handleError(err);
  }
}
