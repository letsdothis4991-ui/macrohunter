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

export function FitBadge({ result }: { result: DishResult }) {
  const { match, fixingTweak } = result;
  if (match.status === "fits") {
    return (
      <span className="badge fit" title={match.fitsWorstCase ? "Fits even at the unfavourable end of the range" : "The middle of the range fits"}>
        {match.fitsWorstCase ? "✓ Fits" : "✓ Likely fits"}
      </span>
    );
  }
  if (fixingTweak) return <span className="badge close">Fits with a tweak</span>;
  if (match.status === "close") return <span className="badge close">Close</span>;
  return <span className="badge miss">Doesn&apos;t fit</span>;
}

export function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  const info = CONFIDENCE_INFO[confidence];
  return (
    <span className={`badge ${confidence === "estimated" ? "est" : "ver"}`} title={info.blurb}>
      {confidence === "estimated" ? "Estimated" : `✓ ${info.label}`}
    </span>
  );
}

export function Rating({ rating, count }: { rating: number | null; count: number | null }) {
  if (rating == null) return <span className="rating tiny">No Google rating</span>;
  return (
    <span className="rating" title={`${rating} out of 5 from ${count ?? 0} Google reviews`}>
      <span className="star" aria-hidden>
        ★
      </span>
      <strong>{rating.toFixed(1)}</strong>
      {count != null && <span className="tiny">({count.toLocaleString("en-AU")})</span>}
      <span className="tiny"> Google</span>
    </span>
  );
}
