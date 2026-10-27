import {
  type Confidence,
  type IngredientId,
  type MacroKey,
  type MacroRange,
  type Macros,
  type Portion,
  macrosFor,
  rangeFor,
} from "./nutrition";

/** Per-meal targets. Protein is a floor; the rest are ceilings. `null` = don't care. */
export type Targets = {
  protein: number | null;
  calories: number | null;
  carbs: number | null;
  fat: number | null;
};

export const DEFAULT_TARGETS: Targets = {
  protein: 35,
  calories: 650,
  carbs: null,
  fat: 25,
};

export const PRESETS: { name: string; targets: Targets }[] = [
  {
    name: "High protein",
    targets: { protein: 40, calories: 700, carbs: null, fat: null },
  },
  {
    name: "Lean cut",
    targets: { protein: 35, calories: 500, carbs: null, fat: 15 },
  },
  {
    name: "Low carb",
    targets: { protein: 30, calories: 650, carbs: 25, fat: null },
  },
  {
    name: "Bulk",
    targets: { protein: 45, calories: 1000, carbs: null, fat: null },
  },
];

export type Tweak = {
  label: string;
  remove?: IngredientId[];
  add?: Portion[];
};

export type Dish = {
  id: string;
  venueId: string;
  name: string;
  description: string;
  /** Null when the menu doesn't show a price. */
  priceAud: number | null;
  portions: Portion[];
  tweaks?: Tweak[];
  /** Overrides the venue's default confidence for this one dish. */
  confidence?: Confidence;
};

export type FitStatus = "fits" | "close" | "miss";

export type Match = {
  status: FitStatus;
  /** 0-100, how close the dish lands to the targets. */
  score: number;
  /** True when even the unfavourable end of the range meets every target. */
  fitsWorstCase: boolean;
  /** Which targets the middle estimate misses. */
  misses: MacroKey[];
};

export type DishResult = {
  dish: Dish;
  range: MacroRange;
  match: Match;
  /** The best single tweak, when it turns a non-fit into a fit. */
  fixingTweak?: { tweak: Tweak; range: MacroRange; match: Match };
};

export function formatPrice(priceAud: number | null): string | null {
  if (priceAud == null) return null;
  return Number.isInteger(priceAud)
    ? `$${priceAud}`
    : `$${priceAud.toFixed(2)}`;
}

export function applyTweak(portions: Portion[], tweak: Tweak): Portion[] {
  const kept = portions.filter((p) => !tweak.remove?.includes(p.ingredient));
  return [...kept, ...(tweak.add ?? [])];
}

/** The pessimistic end of a range for these targets: least protein, most of everything else. */
function worstCase(range: MacroRange): Macros {
  return {
    protein: range.low.protein,
    calories: range.high.calories,
    carbs: range.high.carbs,
    fat: range.high.fat,
  };
}

function missesFor(m: Macros, t: Targets): MacroKey[] {
  const misses: MacroKey[] = [];
  if (t.protein != null && m.protein < t.protein) misses.push("protein");
  if (t.calories != null && m.calories > t.calories) misses.push("calories");
  if (t.carbs != null && m.carbs > t.carbs) misses.push("carbs");
  if (t.fat != null && m.fat > t.fat) misses.push("fat");
  return misses;
}

export function matchMacros(range: MacroRange, t: Targets): Match {
  const m = range.mid;
  // Each target contributes a penalty proportional to how far it is missed.
  const shortfall = (
    actual: number,
    limit: number | null,
    isFloor: boolean,
  ) => {
    if (limit == null || limit <= 0) return 0;
    const gap = isFloor ? limit - actual : actual - limit;
    return Math.max(0, gap) / limit;
  };
  const penalty =
    shortfall(m.protein, t.protein, true) * 120 +
    shortfall(m.calories, t.calories, false) * 100 +
    shortfall(m.carbs, t.carbs, false) * 60 +
    shortfall(m.fat, t.fat, false) * 60;
  const score = Math.max(0, Math.round(100 - penalty));
  const misses = missesFor(m, t);
  const fitsWorstCase = missesFor(worstCase(range), t).length === 0;
  const status: FitStatus =
    misses.length === 0 ? "fits" : score >= 80 ? "close" : "miss";
  return { status, score, fitsWorstCase, misses };
}

export function evaluateDish(
  dish: Dish,
  confidence: Confidence,
  t: Targets,
): DishResult {
  const conf = dish.confidence ?? confidence;
  const range = rangeFor(macrosFor(dish.portions), conf);
  const match = matchMacros(range, t);
  const result: DishResult = { dish, range, match };

  if (match.status !== "fits") {
    for (const tweak of dish.tweaks ?? []) {
      const tRange = rangeFor(
        macrosFor(applyTweak(dish.portions, tweak)),
        conf,
      );
      const tMatch = matchMacros(tRange, t);
      if (
        tMatch.status === "fits" &&
        (!result.fixingTweak || tMatch.score > result.fixingTweak.match.score)
      ) {
        result.fixingTweak = { tweak, range: tRange, match: tMatch };
      }
    }
  }
  return result;
}

const STATUS_ORDER: Record<FitStatus, number> = { fits: 0, close: 1, miss: 2 };

/** Fits first (with a fixing tweak counting as a near-fit), then by score, then by distance. */
export function rankResults<T extends DishResult & { distanceKm: number }>(
  results: T[],
): T[] {
  const rank = (r: T) =>
    r.match.status === "fits"
      ? 0
      : r.fixingTweak
        ? 0.5
        : STATUS_ORDER[r.match.status];
  return [...results].sort(
    (a, b) =>
      rank(a) - rank(b) ||
      b.match.score - a.match.score ||
      a.distanceKm - b.distanceKm,
  );
}
