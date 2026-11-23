/**
 * Everything that calls Claude. Server-only, so the API key never reaches the browser.
 *
 * Claude never states macros directly: it picks ingredients from the shared reference
 * table and estimates grams, and the macros are calculated from that table.
 */
import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

import {
  cleanEstimate,
  DISH_CATEGORIES,
  INGREDIENT_GUIDE,
  MENU_INSTRUCTION,
  MENU_MODEL,
  MENU_SYSTEM_PROMPT,
  type MenuEstimate,
} from "@/lib/menu-estimate";
import { INGREDIENT_IDS, type IngredientId, ingredientName, type Portion } from "@/lib/nutrition";

import { fetchWebsiteMenu, type ImageMediaType, type Menu, type MenuPart } from "../../scripts/ingest/menu";

export class EstimateRefusedError extends Error {}

export function claudeConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  client ??= new Anthropic({ maxRetries: 2 });
  return client;
}

// ---------------------------------------------------------------------------
// Spend guard. The site is shared with a few friends, so cap Claude calls per day
// (per server instance) to keep a runaway loop or a curious friend from running up
// the bill. Override with MAX_CLAUDE_CALLS_PER_DAY.

let usage = { day: "", count: 0 };

export class SpendLimitError extends Error {}

export function takeClaudeCall(): void {
  const limit = Number(process.env.MAX_CLAUDE_CALLS_PER_DAY ?? 150);
  const day = new Date().toISOString().slice(0, 10);
  if (usage.day !== day) usage = { day, count: 0 };
  if (usage.count >= limit) {
    throw new SpendLimitError(
      `The daily limit of ${limit} menu reads and plate checks has been reached. It resets at midnight UTC.`,
    );
  }
  usage.count += 1;
}

// ---------------------------------------------------------------------------
// Menus

export class NoMenuError extends Error {}

export type MenuInput =
  | { kind: "website"; url: string }
  | { kind: "link"; url: string }
  | { kind: "pasted"; text: string }
  | { kind: "photos"; images: { mediaType: ImageMediaType; base64: string }[] };

export async function loadMenu(input: MenuInput): Promise<Menu> {
  if (input.kind === "website" || input.kind === "link") {
    const menu = await fetchWebsiteMenu(input.url);
    if (!menu) throw new NoMenuError("Couldn't find a readable menu on that website.");
    return menu;
  }
  if (input.kind === "pasted") {
    if (input.text.trim().length < 40) throw new NoMenuError("That menu text is too short to read.");
    return { source: "pasted", parts: [{ kind: "text", url: "pasted", text: input.text.slice(0, 60_000) }] };
  }
  const parts: MenuPart[] = input.images.slice(0, 6).map((img, i) => ({
    kind: "image",
    url: `photo-${i + 1}`,
    base64: img.base64,
    mediaType: img.mediaType,
  }));
  if (!parts.length) throw new NoMenuError("Add at least one photo of the menu.");
  return { source: "photos", parts };
}

const ingredientEnum = z.enum(INGREDIENT_IDS as [IngredientId, ...IngredientId[]]);
const PortionSchema = z.object({ ingredient: ingredientEnum, grams: z.number() });

const MenuEstimateSchema = z.object({
  menuFound: z.boolean(),
  cuisine: z.string(),
  dishes: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      priceAud: z.number().nullable(),
      category: z.enum(DISH_CATEGORIES),
      clarity: z.enum(["clear", "vague"]),
      portions: z.array(PortionSchema),
      tweaks: z.array(z.object({ label: z.string(), remove: z.array(ingredientEnum), add: z.array(PortionSchema) })),
    }),
  ),
}) satisfies z.ZodType<MenuEstimate>;

function menuContent(venueName: string, menu: Menu): Anthropic.Beta.BetaContentBlockParam[] {
  const blocks: Anthropic.Beta.BetaContentBlockParam[] = menu.parts.map((part) =>
    part.kind === "pdf"
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: part.base64 }, title: part.url }
      : part.kind === "image"
        ? { type: "image", source: { type: "base64", media_type: part.mediaType, data: part.base64 } }
        : { type: "text", text: `<page url="${part.url}">\n${part.text}\n</page>` },
  );
  blocks.push({ type: "text", text: MENU_INSTRUCTION(venueName) });
  return blocks;
}

export async function readMenu(venueName: string, menu: Menu) {
  takeClaudeCall();
  const stream = getClient().beta.messages.stream({
    model: MENU_MODEL,
    max_tokens: 64000,
    // Re-runs a declined request on a fallback model chosen by the API.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    // "medium" keeps a typical menu under a minute; the batch pipeline uses "high".
    output_config: { effort: "medium", format: betaZodOutputFormat(MenuEstimateSchema) },
    system: [{ type: "text", text: MENU_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: menuContent(venueName, menu) }],
  });
  const message = await stream.finalMessage();
  if (message.stop_reason === "refusal") throw new EstimateRefusedError(`Claude declined to read the menu for ${venueName}.`);
  const estimate = message.parsed_output;
  if (!estimate) {
    throw new Error(`No usable estimate for ${venueName} (stop reason: ${message.stop_reason})`);
  }
  if (!estimate.menuFound || estimate.dishes.length === 0) {
    throw new NoMenuError("Claude couldn't find any dishes in that menu.");
  }
  const { dishes, rejected } = cleanEstimate(estimate);
  return { cuisine: estimate.cuisine || null, dishes, skipped: rejected };
}

// ---------------------------------------------------------------------------
// Check my plate

const PlateSchema = z.object({
  isFood: z.boolean(),
  dishName: z.string(),
  summary: z.string(),
  confidence: z.enum(["low", "medium", "high"]),
  portions: z.array(z.object({ ingredient: ingredientEnum, grams: z.number() })),
  unseen: z.array(z.string()),
  differences: z.array(z.string()),
});

export type PlateEstimate = z.infer<typeof PlateSchema>;

const PLATE_SYSTEM = `You help someone estimate the protein, carbs, fat and calories of a meal they are about to eat at an Australian café or restaurant. You work out what is on the plate and how much; an app then calculates the macros from a food composition table.

Return the ingredients as served, each mapped to the closest id in the ingredient list, with an estimated cooked weight in grams.

How to judge portions from a photo:
- Use the plate, bowl, cutlery, cups and hands as a scale. A standard dinner plate is about 27 cm across; a café bowl about 18 cm.
- Judge each component separately: protein, starch, vegetables, sauces and dressings.
- Always include cooking fat. Anything fried, roasted, sautéed or glossy carries oil or butter, even when you can't see it. Estimate it from the cooking method.

How to use the menu description, when given:
- It tells you what the dish contains. The photo tells you how much.
- If something listed is missing from the photo, or something extra is there, say so in "differences" in plain words (for example "No avocado visible" or "Extra slice of toast"). Leave "differences" empty when there is no listed dish to compare with.

In "unseen", list in plain words what neither the photo nor the description can confirm, such as butter in the eggs, oil in the dressing or sugar in a sauce. At most 4 items.

"summary" is one or two plain sentences describing what you see and the portion size, written to the person ("A large bowl with about 150 g of grilled chicken…").

"confidence" is high when the photo is clear and the dish simple, medium for typical photos, low when the photo is unclear, the dish is mixed or layered (curries, pasta bakes, burritos), or there's text only with no amounts.

If the photo isn't food, set isFood to false and return no portions. Leave out garnishes under 5 g.`;


export type PlateInput = {
  photo?: { mediaType: ImageMediaType; base64: string };
  description?: string;
  listed?: { venueName: string; dishName: string; description: string; portions: Portion[] };
};

export class NotFoodError extends Error {}

export async function checkPlate(input: PlateInput): Promise<PlateEstimate> {
  takeClaudeCall();
  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  if (input.photo) {
    content.push({
      type: "image",
      source: { type: "base64", media_type: input.photo.mediaType, data: input.photo.base64 },
    });
  }
  const lines: string[] = [];
  if (input.listed) {
    lines.push(
      `Listed dish: "${input.listed.dishName}" at ${input.listed.venueName}.`,
      `Menu description: ${input.listed.description || "(none)"}`,
      `Our estimate for the listed dish: ${input.listed.portions
        .map((p) => `${ingredientName(p.ingredient)} ${p.grams} g`)
        .join(", ")}.`,
    );
  }
  if (input.description?.trim()) lines.push(`What the person says about the meal: ${input.description.trim()}`);
  if (!input.photo) lines.push("There is no photo, so estimate typical portions from the text.");
  lines.push(`Ingredient ids you can use: ${INGREDIENT_GUIDE}`);
  lines.push(input.photo ? "Estimate what is on this plate." : "Estimate this meal.");
  content.push({ type: "text", text: lines.join("\n\n") });

  const stream = getClient().beta.messages.stream({
    model: MENU_MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: betaZodOutputFormat(PlateSchema) },
    system: [{ type: "text", text: PLATE_SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content }],
  });
  const message = await stream.finalMessage();
  if (message.stop_reason === "refusal") throw new EstimateRefusedError("Claude declined to check this meal.");
  const out = message.parsed_output;
  if (!out) throw new Error(`No usable estimate (stop reason: ${message.stop_reason})`);
  if (!out.isFood || out.portions.length === 0) {
    throw new NotFoodError("That doesn't look like a meal. Try a clearer photo of the plate, or describe it.");
  }
  return out;
}
