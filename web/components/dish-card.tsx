import Link from "next/link";

import { formatPrice, type DishResult, type Targets } from "@/lib/matching";
import { ingredientName } from "@/lib/nutrition";

import { FitBadge, MACRO_LABEL } from "./badges";
import { MacroGrid } from "./macro-grid";

export function DishCard({
  result,
  targets,
  placeId,
  open,
  venueName,
}: {
  result: DishResult;
  targets: Targets;
  placeId: string;
  venueName?: string;
  open?: boolean;
}) {
  const { dish, range, match, fixingTweak } = result;
  const price = formatPrice(dish.priceAud);
  const spread = range.mid.calories ? Math.round(((range.high.calories - range.mid.calories) / range.mid.calories) * 100) : 20;
  const totalGrams = dish.portions.reduce((n, p) => n + p.grams, 0);
  const checkHref = `/check?venue=${encodeURIComponent(placeId)}&dish=${encodeURIComponent(dish.id)}`;

  return (
    <details className="dish" open={open} id={`dish-${dish.id}`}>
      <summary>
        <div className="dish-head">
          <span className="dish-name">{dish.name}</span>
          <span className="dish-kcal">{range.mid.calories} kcal</span>
          <span className="row" style={{ gap: 12 }}>
            <FitBadge result={result} />
            {venueName && <span className="small muted">{venueName}</span>}
            {price && <span className="small faint">{price}</span>}
          </span>
          <span className="small muted num" style={{ textAlign: "right" }}>
            {range.mid.protein}g protein
          </span>
        </div>
      </summary>

      <div className="dish-body stack">
        {dish.description && <p className="small muted">{dish.description}</p>}
        <MacroGrid range={range} targets={targets} misses={match.misses} />
        {match.misses.length > 0 && !fixingTweak && (
          <p className="small muted">Over your {match.misses.map((k) => MACRO_LABEL[k].toLowerCase()).join(" and ")} target.</p>
        )}
        {fixingTweak && (
          <p className="small">
            <span style={{ color: "var(--accent)", fontWeight: 600 }}>To make it fit:</span> {fixingTweak.tweak.label.toLowerCase()}, for about{" "}
            {fixingTweak.range.mid.calories} kcal and {fixingTweak.range.mid.protein}g protein.
          </p>
        )}
        <p className="small faint">
          Assumes {dish.portions.map((p) => `${ingredientName(p.ingredient)} ${p.grams}g`).join(", ")} (about {totalGrams}g). Range ±{spread}%.
        </p>
        <div className="row" style={{ gap: 20 }}>
          <Link href={checkHref} className="btn small">
            Check my plate
          </Link>
          <Link href="/how-it-works" className="link quiet small">
            How this is estimated
          </Link>
        </div>
      </div>
    </details>
  );
}
