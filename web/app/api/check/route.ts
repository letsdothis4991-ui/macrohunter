import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { INGREDIENT_IDS, type IngredientId, rangeFor, macrosFor } from "@/lib/nutrition";

import { checkPlate, claudeConfigured } from "~/lib/claude";
import { PLATE_SPREAD, rangeWithSpread } from "~/lib/macros";
import type { PlateCheckResult } from "~/lib/types";

import { fail, handleError, isImageType, MAX_IMAGE_BASE64 } from "../_shared";

export const maxDuration = 120;

const PortionSchema = z.object({
  ingredient: z.enum(INGREDIENT_IDS as [IngredientId, ...IngredientId[]]),
  grams: z.number().positive().max(2000),
});

const Body = z.object({
  photo: z.object({ mediaType: z.string(), base64: z.string().max(MAX_IMAGE_BASE64) }).optional(),
  description: z.string().max(2000).optional(),
  listed: z
    .object({
      placeId: z.string().max(300),
      venueName: z.string().max(200),
      dishId: z.string().max(200),
      dishName: z.string().max(200),
      description: z.string().max(2000),
      portions: z.array(PortionSchema).max(40),
    })
    .optional(),
});

export async function POST(req: Request) {
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return fail(400, "That request didn't look right.");
  }
  if (!body.photo && !body.description?.trim()) {
    return fail(400, "Add a photo or describe the meal.");
  }
  if (body.photo && !isImageType(body.photo.mediaType)) {
    return fail(400, "Photos need to be JPEG, PNG, WebP or GIF.");
  }
  if (!claudeConfigured()) {
    return fail(503, "Claude isn't set up yet, so meals can't be checked. Add ANTHROPIC_API_KEY.", "no_claude");
  }

  try {
    const est = await checkPlate({
      photo: body.photo && { mediaType: body.photo.mediaType as "image/jpeg", base64: body.photo.base64 },
      description: body.description,
      listed: body.listed,
    });
    const portions = est.portions
      .filter((p) => Number.isFinite(p.grams) && p.grams > 0)
      .map((p) => ({ ingredient: p.ingredient, grams: Math.round(Math.min(p.grams, 1500)) }));
    const result: PlateCheckResult = {
      id: randomUUID(),
      checkedAt: new Date().toISOString(),
      dishName: est.dishName || body.listed?.dishName || "Your meal",
      summary: est.summary,
      confidence: est.confidence,
      portions,
      range: rangeWithSpread(portions, PLATE_SPREAD[est.confidence]),
      unseen: est.unseen.slice(0, 4),
      differences: body.listed ? est.differences.slice(0, 5) : [],
      usedPhoto: Boolean(body.photo),
      against: body.listed && {
        placeId: body.listed.placeId,
        venueName: body.listed.venueName,
        dishId: body.listed.dishId,
        dishName: body.listed.dishName,
        range: rangeFor(macrosFor(body.listed.portions), "estimated"),
      },
    };
    return NextResponse.json({ result });
  } catch (err) {
    return handleError(err);
  }
}
