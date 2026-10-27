/**
 * Macro maths. Dishes are stored as ingredients + grams, and macros are worked out
 * from a per-100g reference table. The AI estimation step (later) only has to guess
 * ingredients and portions; the numbers always come from real composition data.
 *
 * Values are approximate per 100g, cooked/as-served, in the style of FSANZ AUSNUT.
 * Swap this table for the real AUSNUT dataset before launch.
 */

export type Macros = {
  calories: number; // kcal
  protein: number; // g
  carbs: number; // g
  fat: number; // g
};

export type MacroKey = keyof Macros;

export const MACRO_KEYS: MacroKey[] = ["calories", "protein", "carbs", "fat"];

export type IngredientId = keyof typeof INGREDIENTS;

export type Portion = { ingredient: IngredientId; grams: number };

/** How a dish's numbers were sourced, from most to least certain. */
export type Confidence = "chain" | "verified" | "estimated";

export const CONFIDENCE_INFO: Record<
  Confidence,
  { label: string; spread: number; blurb: string }
> = {
  chain: {
    label: "Chain-published",
    spread: 0.03,
    blurb: "From the chain's published nutrition information.",
  },
  verified: {
    label: "Venue-verified",
    spread: 0.08,
    blurb: "The venue has checked these numbers against its recipe.",
  },
  estimated: {
    label: "Estimated",
    spread: 0.2,
    blurb:
      "Worked out from the menu description and typical portions. Real serves vary, so treat this as a guide.",
  },
};

// [kcal, protein g, carbs g, fat g] per 100g
const INGREDIENTS = {
  chickenBreast: [165, 31, 0, 3.6],
  beefSteak: [210, 29, 0, 10],
  beefPatty: [250, 20, 0, 18],
  beefMince: [215, 26, 0, 12],
  bacon: [280, 28, 1, 18],
  salmon: [206, 22, 0, 13],
  smokedSalmon: [117, 18, 0, 4.3],
  tunaRaw: [110, 24, 0, 1],
  egg: [155, 13, 1.1, 11],
  eggWhite: [52, 11, 0.7, 0.2],
  tofu: [144, 15, 3, 9],
  halloumi: [320, 22, 2, 25],
  feta: [264, 14, 4, 21],
  cheddar: [400, 25, 1, 33],
  ricotta: [174, 11, 3, 13],
  greekYoghurt: [97, 9, 4, 5],
  milk: [64, 3.4, 4.8, 3.6],
  wheyProtein: [400, 80, 8, 6],
  sourdough: [260, 9, 50, 2.5],
  burgerBun: [280, 9, 50, 4.5],
  tortilla: [300, 8, 50, 7],
  whiteRice: [130, 2.7, 28, 0.3],
  brownRice: [123, 2.7, 26, 1],
  quinoa: [120, 4.4, 21, 1.9],
  pasta: [158, 5.8, 31, 0.9],
  oats: [380, 13, 60, 7],
  granola: [470, 10, 60, 20],
  pancake: [227, 6, 28, 10],
  sweetPotato: [90, 2, 21, 0.2],
  chips: [312, 3.4, 41, 15],
  blackBeans: [132, 9, 24, 0.5],
  edamame: [121, 12, 9, 5],
  falafel: [333, 13, 32, 18],
  hummus: [170, 8, 14, 10],
  avocado: [160, 2, 9, 15],
  saladLeaves: [20, 1.5, 3, 0.2],
  spinach: [23, 2.9, 3.6, 0.4],
  mushrooms: [22, 3, 3, 0.3],
  kimchi: [15, 1, 2, 0.5],
  tomatoSauce: [40, 1.5, 7, 1],
  berries: [50, 0.7, 12, 0.3],
  banana: [89, 1.1, 23, 0.3],
  peanutButter: [590, 25, 20, 50],
  maple: [260, 0, 67, 0],
  oliveOil: [884, 0, 0, 100],
  aioli: [680, 1, 1, 75],
  hollandaise: [500, 3, 2, 54],
  pesto: [450, 5, 6, 45],
  sesameDressing: [400, 2, 15, 37],
  teriyaki: [90, 6, 15, 0],
} as const satisfies Record<string, readonly [number, number, number, number]>;

export function isIngredient(id: string): id is IngredientId {
  return id in INGREDIENTS;
}

export function macrosFor(portions: Portion[]): Macros {
  const total: Macros = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  for (const { ingredient, grams } of portions) {
    const [kcal, protein, carbs, fat] = INGREDIENTS[ingredient];
    const f = grams / 100;
    total.calories += kcal * f;
    total.protein += protein * f;
    total.carbs += carbs * f;
    total.fat += fat * f;
  }
  return roundMacros(total);
}

export function roundMacros(m: Macros): Macros {
  return {
    calories: Math.round(m.calories),
    protein: Math.round(m.protein),
    carbs: Math.round(m.carbs),
    fat: Math.round(m.fat),
  };
}

export type MacroRange = { low: Macros; mid: Macros; high: Macros };

export function rangeFor(mid: Macros, confidence: Confidence): MacroRange {
  const s = CONFIDENCE_INFO[confidence].spread;
  const scale = (k: number) =>
    roundMacros({
      calories: mid.calories * k,
      protein: mid.protein * k,
      carbs: mid.carbs * k,
      fat: mid.fat * k,
    });
  return { low: scale(1 - s), mid, high: scale(1 + s) };
}

/** "chickenBreast" -> "chicken breast" */
export function ingredientName(id: IngredientId): string {
  return id.replace(/([A-Z])/g, " $1").toLowerCase();
}
