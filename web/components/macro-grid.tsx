import type { Targets } from "@/lib/matching";
import type { MacroKey, MacroRange } from "@/lib/nutrition";

import { MACRO_LABEL } from "./badges";
import { MacroRing } from "./plate-bar";

function targetNote(key: MacroKey, target: number | null | undefined, miss: boolean) {
  if (target == null) return null;
  const unit = key === "calories" ? " kcal" : "g";
  if (miss) return <b>{key === "protein" ? `under your ${target}${unit}` : `over your ${target}${unit}`}</b>;
  return key === "protein" ? `aim ${target}${unit}+` : `limit ${target}${unit}`;
}

/** The nutrition panel: a ring of where the calories come from, then each macro with its range. */
export function MacroGrid({ range, targets, misses = [] }: { range: MacroRange; targets?: Targets; misses?: MacroKey[] }) {
  const kcalMiss = misses.includes("calories");
  return (
    <div className="panel">
      <MacroRing macros={range.mid}>
        <span className={`ring-kcal${kcalMiss ? " miss" : ""}`}>{range.mid.calories}</span>
        <span className="ring-unit">kcal</span>
      </MacroRing>
      <div className="panel-rows">
        <div className="pr kcal">
          <span className="pr-l">Calories</span>
          <span className="pr-r">
            {range.low.calories} to {range.high.calories}
            {targets?.calories != null && <>, {targetNote("calories", targets.calories, kcalMiss)}</>}
          </span>
        </div>
        {(["protein", "carbs", "fat"] as MacroKey[]).map((key) => {
          const miss = misses.includes(key);
          const note = targetNote(key, targets?.[key], miss);
          return (
            <div key={key} className={`pr ${key}${miss ? " miss" : ""}`}>
              <span className="pr-l">
                <i className="dot" />
                {MACRO_LABEL[key]}
              </span>
              <span className="pr-v">{range.mid[key]}g</span>
              <span className="pr-r">
                {range.low[key]} to {range.high[key]}g{note && <>, {note}</>}
              </span>
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
