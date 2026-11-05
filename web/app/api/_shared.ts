import "server-only";

import { NextResponse } from "next/server";

import { GoogleError } from "~/lib/google";
import { EstimateRefusedError, NoMenuError, NotFoodError, SpendLimitError } from "~/lib/claude";

export function fail(status: number, error: string, code?: string) {
  return NextResponse.json({ error, code }, { status });
}

/** Turns known failures into friendly messages; logs the rest. */
export function handleError(err: unknown) {
  if (err instanceof SpendLimitError) return fail(429, err.message, "spend_limit");
  if (err instanceof NoMenuError) return fail(422, err.message, "no_menu");
  if (err instanceof NotFoodError) return fail(422, err.message, "not_food");
  if (err instanceof EstimateRefusedError) return fail(422, err.message, "refused");
  if (err instanceof GoogleError) return fail(502, err.message, "google");
  const anyErr = err as { status?: number; message?: string };
  if (anyErr?.status === 401) return fail(500, "The Anthropic API key was rejected. Check ANTHROPIC_API_KEY.", "claude_key");
  if (anyErr?.status === 429) return fail(429, "Claude is busy right now. Wait a minute and try again.", "claude_busy");
  console.error(err);
  return fail(500, "Something went wrong on our side. Please try again.");
}

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
export type ImageType = (typeof IMAGE_TYPES)[number];

export function isImageType(t: unknown): t is ImageType {
  return typeof t === "string" && (IMAGE_TYPES as readonly string[]).includes(t);
}

/** ~5 MB of base64 per image is plenty after the browser shrinks photos. */
export const MAX_IMAGE_BASE64 = 7_000_000;
