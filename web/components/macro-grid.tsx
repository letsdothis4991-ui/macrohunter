import type { Targets } from "@/lib/matching";
import type { MacroKey, MacroRange } from "@/lib/nutrition";

import { MACRO_LABEL, MACRO_ORDER } from "./badges";

/** Four numbers: the middle estimate large, the range small, misses in red. */
export function MacroGrid({ range, misses = [] }: { range: MacroRange; targets?: Targets; misses?: MacroKey[] }) {
  return (
    <div className="macros">
      {MACRO_ORDER.map((key) => {
        return (
          <div key={key} className={`macro${misses.includes(key) ? " miss" : ""}`}>
            <div className="v">
              {range.mid[key]}
              <small>{key === "calories" ? "kcal" : "g"}</small>
            </div>
            <div className="l">{MACRO_LABEL[key]}</div>
            <div className="r">
              {range.low[key]}–{range.high[key]}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function MacroLine({ range }: { range: MacroRange }) {
  const m = range.mid;
  return (
    <span className="small muted num">
      {m.calories} kcal · {m.protein}g protein · {m.carbs}g carbs · {m.fat}g fat
    </span>
  );
}
