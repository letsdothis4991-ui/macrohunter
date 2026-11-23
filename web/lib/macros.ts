import { type MacroRange, macrosFor, type Portion, roundMacros } from "@/lib/nutrition";

import type { PlateConfidence } from "./types";

/** How wide a plate check's range is, by how sure Claude was. */
export const PLATE_SPREAD: Record<PlateConfidence, number> = { high: 0.12, medium: 0.2, low: 0.3 };

export function rangeWithSpread(portions: Portion[], spread: number): MacroRange {
  const mid = macrosFor(portions);
  const scale = (k: number) =>
    roundMacros({
      calories: mid.calories * k,
      protein: mid.protein * k,
      carbs: mid.carbs * k,
      fat: mid.fat * k,
    });
  return { low: scale(1 - spread), mid, high: scale(1 + spread) };
}

export function slug(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "dish"
  );
}
