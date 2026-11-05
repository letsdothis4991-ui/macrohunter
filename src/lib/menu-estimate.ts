/**
 * The parts of menu reading that don't depend on any package: the prompt, the shape
 * Claude returns, and the clean-up rules. Shared by the batch pipeline
 * (scripts/ingest/estimate.ts) and the website (web/lib/claude.ts), which each build
 * the matching zod schema and make the API call themselves.
 */
import { INGREDIENT_IDS, type IngredientId, ingredientName, type Portion } from "./nutrition";

export const MENU_MODEL = "claude-opus-5-5";

export const DISH_CATEGORIES = [
  "breakfast",
  "main",
  "salad_or_bowl",
  "sandwich_or_wrap",
  "side",
  "snack",
  "dessert",
  "shake_or_smoothie",
] as const;

export type EstimatedPortion = { ingredient: IngredientId; grams: number };

export type EstimatedDish = {
  name: string;
  description: string;
  priceAud: number | null;
  category: (typeof DISH_CATEGORIES)[number];
  clarity: "clear" | "vague";
  portions: EstimatedPortion[];
  tweaks: { label: string; remove: IngredientId[]; add: EstimatedPortion[] }[];
};

export type MenuEstimate = {
  menuFound: boolean;
  cuisine: string;
  dishes: EstimatedDish[];
};

export const MENU_SYSTEM_PROMPT = `You estimate what is in dishes on Australian café and restaurant menus, so that an app can work out their protein, carbs, fat and calories.

For every food item on the menu, list its ingredients as served, each with an estimated cooked weight in grams, using typical Australian café and restaurant portion sizes. Map each ingredient to the closest id in the ingredient list. Include what the description implies even if it isn't named, such as cooking oil or butter, dressings, sauces and the bread under a topping. Leave out garnishes under 5 g.

Rules:
- Only include dishes that are actually on the menu. Use the menu's dish name and a short description in its own words. Give the price in AUD if it is shown, otherwise null.
- Skip coffee, tea, alcohol, soft drinks and juices. Do include protein shakes and smoothies.
- Skip items that are only an extra or add-on (like "add egg +$3"). Turn those into tweaks on the dishes they apply to instead.
- Tweaks are changes a customer could reasonably ask for that change the macros: add-ons the menu offers, and simple removals such as no chips, no sauce or no bread. At most 3 per dish. Each tweak lists the ingredient ids to remove and the portions to add.
- Mark a dish "vague" when the menu doesn't say enough to estimate it (for example "chef's special" or "market fish of the day"), otherwise "clear".
- If the text isn't a food menu at all (for example a bookings page with no dishes), set menuFound to false and return no dishes.
- cuisine is 1 to 3 words describing the venue's food, such as "Brunch", "Korean" or "Pizza".`;

export const INGREDIENT_GUIDE = INGREDIENT_IDS.map(
  (id) => `${id} (${ingredientName(id)})`,
).join(", ");

export const MENU_INSTRUCTION = (venueName: string) =>
  `Venue: ${venueName}\n\nIngredient ids you can use: ${INGREDIENT_GUIDE}\n\nList every dish on this menu with its ingredients and grams.`;

/** Plausibility limits for one dish. Anything outside them is a misread, not a meal. */
const MAX_INGREDIENT_GRAMS = 800;
const MIN_DISH_GRAMS = 40;
const MAX_DISH_GRAMS = 2000;

export type CleanDish = {
  name: string;
  description: string;
  priceAud: number | null;
  portions: Portion[];
  tweaks: { label: string; remove: IngredientId[]; add: Portion[] }[];
};

export type Rejected = { name: string; reason: string };

/** Drops vague or implausible dishes and merges repeated ingredients. */
export function cleanEstimate(estimate: MenuEstimate): {
  dishes: CleanDish[];
  rejected: Rejected[];
} {
  const dishes: CleanDish[] = [];
  const rejected: Rejected[] = [];
  const seen = new Set<string>();
  for (const d of estimate.dishes) {
    const name = d.name.trim();
    const key = name.toLowerCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);
    if (d.clarity === "vague") {
      rejected.push({ name, reason: "menu description too vague" });
      continue;
    }
    const portions = mergePortions(d.portions);
    const total = portions.reduce((n, p) => n + p.grams, 0);
    if (
      portions.some((p) => p.grams > MAX_INGREDIENT_GRAMS) ||
      total < MIN_DISH_GRAMS ||
      total > MAX_DISH_GRAMS
    ) {
      rejected.push({
        name,
        reason: `implausible portion (${Math.round(total)} g)`,
      });
      continue;
    }
    const tweaks = d.tweaks
      .map((t) => ({
        label: t.label.trim(),
        remove: t.remove,
        add: mergePortions(t.add),
      }))
      .filter(
        (t) =>
          t.label &&
          (t.remove.length || t.add.length) &&
          t.add.every((p) => p.grams <= MAX_INGREDIENT_GRAMS),
      )
      .slice(0, 3);
    dishes.push({
      name,
      description: d.description.trim(),
      priceAud:
        d.priceAud != null && d.priceAud > 0 && d.priceAud < 500
          ? d.priceAud
          : null,
      portions,
      tweaks,
    });
  }
  return { dishes, rejected };
}

export function mergePortions(
  portions: { ingredient: IngredientId; grams: number }[],
): Portion[] {
  const byId = new Map<IngredientId, number>();
  for (const p of portions) {
    if (!Number.isFinite(p.grams) || p.grams <= 0) continue;
    byId.set(p.ingredient, (byId.get(p.ingredient) ?? 0) + p.grams);
  }
  return [...byId.entries()].map(([ingredient, grams]) => ({
    ingredient,
    grams: Math.round(grams),
  }));
}
