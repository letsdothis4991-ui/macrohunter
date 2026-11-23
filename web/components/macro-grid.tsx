import type { Targets } from "@/lib/matching";
import type { MacroKey, MacroRange } from "@/lib/nutrition";

import { MACRO_LABEL } from "./badges";
import { PlateBar } from "./plate-bar";

function targetNote(key: MacroKey, target: number | null | undefined, miss: boolean) {
  if (target == null) return null;
  if (miss) return <b>{key === "protein" ? `${target}g needed` : `over ${target}${key === "calories" ? "" : "g"}`}</b>;
  return key === "protein" ? `min ${target}g` : `max ${target}${key === "calories" ? "" : "g"}`;
}

/**
 * The nutrition panel: calories large with where they come from, then protein,
 * carbs and fat in their own colours, each with its range and your target.
 */
export function MacroGrid({ range, targets, misses = [] }: { range: MacroRange; targets?: Targets; misses?: MacroKey[] }) {
  const kcalMiss = misses.includes("calories");
  return (
    <div className="panel">
      <div className="panel-top">
        <div className={`panel-kcal${kcalMiss ? " miss" : ""}`}>
          <span className="big">{range.mid.calories}</span>
          <span className="unit">kcal</span>
        </div>
        <div className="panel-range">
          {range.low.calories} to {range.high.calories}
          {targets?.calories != null && <>, {targetNote("calories", targets.calories, kcalMiss)}</>}
        </div>
      </div>
      <PlateBar macros={range.mid} />
      <div className="panel-macros">
        {(["protein", "carbs", "fat"] as MacroKey[]).map((key) => {
          const miss = misses.includes(key);
          const note = targetNote(key, targets?.[key], miss);
          return (
            <div key={key} className={`pm ${key}${miss ? " miss" : ""}`}>
              <div className="pm-v">
                {range.mid[key]}
                <small>g</small>
              </div>
              <div className="pm-l">{MACRO_LABEL[key]}</div>
              <div className="pm-r">
                {range.low[key]} to {range.high[key]}
                {note && <>, {note}</>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function MacroLine({ range }: { range: MacroRange }) {
  const m = range.mid;
  return (
    <span className="small muted num">
      {m.calories} kcal, {m.protein}g protein, {m.carbs}g carbs, {m.fat}g fat
    </span>
  );
}
