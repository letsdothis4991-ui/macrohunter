"use client";
import Link from "next/link";

import { matchMacros } from "@/lib/matching";

import { fitText } from "~/components/badges";
import { MealActions } from "~/components/meal-actions";
import { useHydrated, useSavedDishes, useSavedPlaces } from "~/lib/store";
import { useFitTargets } from "~/lib/use-fit-targets";

export default function SavedPage() {
  const hydrated = useHydrated();
  const dishes = useSavedDishes();
  const places = useSavedPlaces();
  const { targets } = useFitTargets();

  if (!hydrated)
    return <div className="skeleton narrow" style={{ height: 320 }} />;

  return (
    <div className="stack-lg narrow">
      <section className="stack-sm">
        <div className="eyebrow">Saved</div>
        <h1>Your go-tos</h1>
        <p className="muted">
          Star dishes and places to find them again quickly. Saved in this
          browser.
        </p>
      </section>

      <section className="stack">
        <h2>Dishes</h2>
        {dishes.saved.length === 0 ? (
          <p className="empty small">
            No saved dishes yet. Open a dish on any menu and tap <b>☆ Save</b>.
          </p>
        ) : (
          <div className="list">
            {dishes.saved.map((d) => {
              const match = matchMacros(d.range, targets);
              const f = fitText({
                dish: {
                  id: d.dishId,
                  venueId: d.placeId,
                  name: d.name,
                  description: d.description,
                  priceAud: null,
                  portions: [],
                },
                range: d.range,
                match,
              });
              const m = d.range.mid;
              return (
                <details className="dish" key={d.key}>
                  <summary>
                    <div className="dish-head">
                      <span className="dish-name">{d.name}</span>
                      <span className="dish-kcal">{m.calories} kcal</span>
                      <span className="row" style={{ gap: 12 }}>
                        <span className={`fit ${f.tone}`}>{f.text}</span>
                        <span className="small muted">{d.venueName}</span>
                      </span>
                      <span
                        className="small muted num"
                        style={{ textAlign: "right" }}
                      >
                        {m.protein}g protein
                      </span>
                    </div>
                  </summary>
                  <div className="dish-body stack">
                    {d.description && (
                      <p className="small muted">{d.description}</p>
                    )}
                    <p className="small muted num">
                      {d.range.low.calories}–{d.range.high.calories} kcal ·{" "}
                      {m.protein}g protein · {m.carbs}g carbs · {m.fat}g fat
                    </p>
                    <MealActions
                      meal={{
                        name: d.name,
                        range: d.range,
                        source: "menu",
                        venueName: d.venueName,
                        placeId: d.placeId,
                        dishId: d.dishId,
                        description: d.description,
                      }}
                    >
                      <Link
                        href={`/venue/${encodeURIComponent(d.placeId)}`}
                        className="btn small"
                      >
                        Open menu
                      </Link>
                    </MealActions>
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </section>

      <section className="stack">
        <h2>Places</h2>
        {places.saved.length === 0 ? (
          <p className="empty small">
            No saved places yet. Tap <b>☆ Save place</b> on any venue.
          </p>
        ) : (
          <div className="list">
            {places.saved.map((p) => (
              <div
                className="item spread"
                key={p.placeId}
                style={{ alignItems: "center" }}
              >
                <Link
                  href={`/venue/${encodeURIComponent(p.placeId)}`}
                  style={{ minWidth: 0, flex: 1 }}
                >
                  <div className="item-title">{p.name}</div>
                  {p.detail && <div className="small muted">{p.detail}</div>}
                </Link>
                <button
                  className="link quiet small"
                  onClick={() => places.toggle(p)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
