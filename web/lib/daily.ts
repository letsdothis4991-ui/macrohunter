/**
 * The daily tracker: what you logged today, your daily totals, and per-meal targets
 * that shrink to fit whatever is left of the day.
 */
import type { Targets } from "@/lib/matching";
import type { MacroKey, MacroRange, Macros } from "@/lib/nutrition";

export type LogEntry = {
  id: string;
  /** Local calendar day, YYYY-MM-DD. */
  day: string;
  at: string;
  name: string;
  venueName?: string;
  placeId?: string;
  dishId?: string;
  source: "menu" | "plate" | "manual";
  macros: Macros;
  range?: MacroRange;
};

/** Daily totals. Same shape as per-meal targets: protein is a minimum, the rest are maximums. */
export const DEFAULT_DAILY: Targets = { protein: 120, calories: 2000, carbs: null, fat: 70 };

export const MACRO_KEYS: MacroKey[] = ["calories", "protein", "carbs", "fat"];

export function dayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function shiftDay(day: string, by: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return dayKey(new Date(y, m - 1, d + by));
}

export function totalsFor(entries: LogEntry[]): Macros {
  const t: Macros = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  for (const e of entries) for (const k of MACRO_KEYS) t[k] += e.macros[k];
  for (const k of MACRO_KEYS) t[k] = Math.round(t[k]);
  return t;
}

/** What's left of each daily total (negative means over). Null where no daily total is set. */
export function leftToday(daily: Targets, eaten: Macros): Record<MacroKey, number | null> {
  const out = {} as Record<MacroKey, number | null>;
  for (const k of MACRO_KEYS) out[k] = daily[k] == null ? null : Math.round((daily[k] as number) - eaten[k]);
  return out;
}

/**
 * Targets for the next meal given what's left today. Ceilings shrink to what's left
 * (never below zero); the protein floor shrinks to what you still need, and drops once
 * you've hit your daily protein.
 */
export function targetsForWhatsLeft(perMeal: Targets, daily: Targets, eaten: Macros): Targets {
  const left = leftToday(daily, eaten);
  const out: Targets = { ...perMeal };
  for (const k of ["calories", "carbs", "fat"] as const) {
    const l = left[k];
    if (l == null) continue;
    const room = Math.max(0, l);
    out[k] = perMeal[k] == null ? room : Math.min(perMeal[k] as number, room);
  }
  const p = left.protein;
  if (p != null) out.protein = p <= 0 ? null : perMeal.protein == null ? p : Math.min(perMeal.protein, p);
  return out;
}
