import type { DishResult } from "@/lib/matching";
import { CONFIDENCE_INFO, type Confidence, type MacroKey } from "@/lib/nutrition";

export const MACRO_LABEL: Record<MacroKey, string> = {
  calories: "Calories",
  protein: "Protein",
  carbs: "Carbs",
  fat: "Fat",
};

export const MACRO_ORDER: MacroKey[] = ["calories", "protein", "carbs", "fat"];

export function unit(key: MacroKey) {
  return key === "calories" ? " kcal" : "g";
}

export function fitText(result: DishResult): { text: string; tone: "yes" | "close" | "no" } {
  const { match, fixingTweak } = result;
  if (match.status === "fits") return { text: match.fitsWorstCase ? "Fits" : "Likely fits", tone: "yes" };
  if (fixingTweak) return { text: "Fits with a change", tone: "close" };
  if (match.status === "close") return { text: "Close", tone: "close" };
  return { text: "Doesn't fit", tone: "no" };
}

export function FitBadge({ result }: { result: DishResult }) {
  const f = fitText(result);
  return <span className={`fit ${f.tone}`}>{f.text}</span>;
}

export function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  const info = CONFIDENCE_INFO[confidence];
  return (
    <span className="small faint" title={info.blurb}>
      {info.label}
    </span>
  );
}

export function Rating({ rating, count }: { rating: number | null; count: number | null }) {
  if (rating == null) return null;
  return (
    <span className="rating" title={`${rating} out of 5 from ${count ?? 0} Google reviews`}>
      ★ <b>{rating.toFixed(1)}</b>
      {count != null && <span className="faint"> ({count.toLocaleString("en-AU")})</span>}
    </span>
  );
}
