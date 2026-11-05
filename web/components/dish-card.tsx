import Link from "next/link";

import { formatPrice, type DishResult, type Targets } from "@/lib/matching";
import { ingredientName } from "@/lib/nutrition";

import { ConfidenceBadge, FitBadge, MACRO_LABEL } from "./badges";
import { MacroGrid, MacroLine } from "./macro-grid";

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
  const confidence = dish.confidence ?? "estimated";
  const price = formatPrice(dish.priceAud);
  const totalGrams = dish.portions.reduce((n, p) => n + p.grams, 0);
  const checkHref = `/check?venue=${encodeURIComponent(placeId)}&dish=${encodeURIComponent(dish.id)}`;

  return (
    <details className="card dish" open={open} id={`dish-${dish.id}`}>
      <summary>
        <div className="spread" style={{ alignItems: "flex-start", flexWrap: "nowrap" }}>
          <div style={{ minWidth: 0 }}>
            <div className="dish-name">{dish.name}</div>
            {venueName && <div className="small muted">{venueName}</div>}
            <div className="row" style={{ marginTop: 4 }}>
              <FitBadge result={result} />
              <ConfidenceBadge confidence={confidence} />
              {price && <span className="small muted">{price}</span>}
            </div>
            <div style={{ marginTop: 4 }}>
              <MacroLine range={range} />
            </div>
          </div>
          <span className="chev" aria-hidden>
            ▶
          </span>
        </div>
      </summary>

      <div className="stack" style={{ marginTop: 14 }}>
        {dish.description && <p className="muted small" style={{ margin: 0 }}>{dish.description}</p>}
        <MacroGrid range={range} targets={targets} misses={match.misses} />
        {match.misses.length > 0 && (
          <p className="small" style={{ margin: 0 }}>
            Misses your {match.misses.map((k) => MACRO_LABEL[k].toLowerCase()).join(" and ")} target
            {match.misses.length > 1 ? "s" : ""}.
          </p>
        )}

        {fixingTweak && (
          <div className="notice good small">
            <strong>Make it fit:</strong> {fixingTweak.tweak.label}. That brings it to about {fixingTweak.range.mid.calories} kcal and{" "}
            {fixingTweak.range.mid.protein}g protein.
          </div>
        )}

        {dish.tweaks && dish.tweaks.length > 0 && !fixingTweak && (
          <div className="small">
            <strong>Ways to change it:</strong> {dish.tweaks.map((t) => t.label).join(" · ")}
          </div>
        )}

        <div>
          <h3 style={{ fontSize: "0.9rem" }}>What we assumed is in it (about {totalGrams} g)</h3>
          <ul className="ingredients">
            {dish.portions.map((p) => (
              <li key={p.ingredient}>
                <span>{ingredientName(p.ingredient)}</span>
                <span className="muted">{p.grams} g</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="spread">
          <span className="tiny muted">
            Range is ±{confidence === "estimated" ? "20" : confidence === "verified" ? "8" : "3"}% of the middle estimate.{" "}
            <Link href="/how-it-works">How we estimate</Link>
          </span>
          <Link href={checkHref} className="btn primary small">
            📷 Check my plate
          </Link>
        </div>
      </div>
    </details>
  );
}
