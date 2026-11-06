/**
 * Macro maths. Dishes are stored as ingredients + grams, and macros are worked out
 * from a per-100g reference table. The AI estimation step (scripts/ingest) only has to
 * guess ingredients and portions; the numbers always come from composition data.
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
  chickenThigh: [190, 24, 0, 10.5],
  friedChicken: [260, 20, 12, 15],
  lamb: [250, 25, 0, 16],
  pork: [240, 27, 0, 14],
  porkBelly: [420, 18, 0, 38],
  ham: [120, 18, 2, 4.5],
  sausage: [300, 13, 3, 26],
  chorizo: [450, 24, 2, 38],
  prawns: [100, 22, 0, 1.2],
  whiteFish: [110, 23, 0, 1.5],
  tunaCanned: [120, 26, 0, 1],
  mozzarella: [280, 22, 3, 20],
  parmesan: [400, 35, 3, 28],
  goatCheese: [290, 19, 1, 23],
  cream: [340, 2, 3, 36],
  butter: [717, 0.9, 0.1, 81],
  plainYoghurt: [70, 4, 6, 3.5],
  oatMilk: [45, 1, 6.5, 1.5],
  almondMilk: [15, 0.5, 0.3, 1.2],
  whiteBread: [265, 9, 49, 3.2],
  wholegrainBread: [250, 13, 43, 3.5],
  bagel: [257, 10, 50, 1.5],
  croissant: [406, 8, 46, 21],
  pita: [275, 9, 55, 1.2],
  pizzaBase: [270, 8, 50, 4],
  sushiRice: [150, 2.5, 33, 0.3],
  eggNoodles: [138, 4.5, 25, 2],
  riceNoodles: [110, 1.8, 25, 0.2],
  dumplings: [200, 8, 25, 7],
  potato: [87, 2, 20, 0.1],
  roastPotato: [150, 2.6, 24, 5],
  hashBrown: [270, 2.5, 30, 15],
  corn: [96, 3.4, 21, 1.5],
  bakedBeans: [90, 5, 13, 0.4],
  lentils: [116, 9, 20, 0.4],
  chickpeas: [164, 9, 27, 2.6],
  mixedVeg: [50, 2.5, 9, 0.4],
  broccoli: [35, 2.4, 7, 0.4],
  tomato: [18, 0.9, 3.9, 0.2],
  coleslaw: [150, 1, 10, 12],
  mixedFruit: [55, 0.5, 13, 0.2],
  acaiBlend: [70, 1, 12, 2.5],
  nuts: [600, 20, 20, 52],
  tahini: [600, 17, 21, 54],
  vinaigrette: [450, 0, 5, 48],
  currySauce: [150, 2, 6, 13],
  gravy: [50, 1, 6, 2.5],
  bbqSauce: [110, 1, 26, 0.2],
  sweetChilli: [200, 0.5, 48, 0.5],
  honey: [300, 0.3, 80, 0],
  sugar: [400, 0, 100, 0],
  chocolate: [540, 5, 58, 31],
  cake: [400, 5, 55, 18],
  iceCream: [210, 3.5, 24, 11],
  juice: [45, 0.5, 10, 0.1],
  softDrink: [42, 0, 10.6, 0],
} as const satisfies Record<string, readonly [number, number, number, number]>;

export const INGREDIENT_IDS = Object.keys(INGREDIENTS) as IngredientId[];

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
