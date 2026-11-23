/**
 * Reads a menu with Claude and turns each dish into ingredients + grams.
 * Claude only picks ingredients from our reference table and estimates portions;
 * macros are always computed from the table (src/lib/nutrition.ts), never by the model.
 * The prompt and clean-up rules live in src/lib/menu-estimate.ts, shared with the website.
 */
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

import {
  DISH_CATEGORIES,
  MENU_INSTRUCTION,
  MENU_MODEL,
  MENU_SYSTEM_PROMPT,
  type MenuEstimate,
} from "../../src/lib/menu-estimate";
import { INGREDIENT_IDS, type IngredientId } from "../../src/lib/nutrition";
import type { Menu } from "./menu";

export {
  type CleanDish,
  cleanEstimate,
  type EstimatedDish,
  type MenuEstimate,
  type Rejected,
} from "../../src/lib/menu-estimate";

export const MODEL = MENU_MODEL;

const ingredientEnum = z.enum(
  INGREDIENT_IDS as [IngredientId, ...IngredientId[]],
);

const PortionSchema = z.object({
  ingredient: ingredientEnum,
  grams: z.number(),
});

const DishSchema = z.object({
  name: z.string(),
  description: z.string(),
  priceAud: z.number().nullable(),
  category: z.enum(DISH_CATEGORIES),
  clarity: z.enum(["clear", "vague"]),
  portions: z.array(PortionSchema),
  tweaks: z.array(
    z.object({
      label: z.string(),
      remove: z.array(ingredientEnum),
      add: z.array(PortionSchema),
    }),
  ),
});

export const MenuEstimateSchema = z.object({
  menuFound: z.boolean(),
  cuisine: z.string(),
  dishes: z.array(DishSchema),
}) satisfies z.ZodType<MenuEstimate>;

function menuContent(
  venueName: string,
  menu: Menu,
): Anthropic.Beta.BetaContentBlockParam[] {
  const blocks: Anthropic.Beta.BetaContentBlockParam[] = [];
  for (const part of menu.parts) {
    if (part.kind === "pdf") {
      blocks.push({
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: part.base64,
        },
        title: part.url,
      });
    } else if (part.kind === "image") {
      blocks.push({
        type: "image",
        source: {
          type: "base64",
          media_type: part.mediaType,
          data: part.base64,
        },
      });
    } else {
      blocks.push({
        type: "text",
        text: `<page url="${part.url}">\n${part.text}\n</page>`,
      });
    }
  }
  blocks.push({
    type: "text",
    text: MENU_INSTRUCTION(venueName),
  });
  return blocks;
}

export class EstimateRefusedError extends Error {}

export async function estimateMenu(
  client: Anthropic,
  venueName: string,
  menu: Menu,
): Promise<MenuEstimate> {
  const stream = client.beta.messages.stream({
    model: MODEL,
    max_tokens: 64000,
    // Re-runs a declined request on a fallback model chosen by the API.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: {
      effort: "high",
      format: betaZodOutputFormat(MenuEstimateSchema),
    },
    system: [
      { type: "text", text: MENU_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
    ],
    messages: [{ role: "user", content: menuContent(venueName, menu) }],
  });
  const message = await stream.finalMessage();
  if (message.stop_reason === "refusal") {
    throw new EstimateRefusedError(
      `Claude declined to read the menu for ${venueName}`,
    );
  }
  if (message.stop_reason === "max_tokens" || !message.parsed_output) {
    throw new Error(
      `No usable estimate for ${venueName} (stop reason: ${message.stop_reason})`,
    );
  }
  return message.parsed_output;
}

