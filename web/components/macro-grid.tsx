import type { Targets } from "@/lib/matching";
import type { MacroKey, MacroRange } from "@/lib/nutrition";

import { MACRO_LABEL, MACRO_ORDER } from "./badges";

/**
 * Four coloured tiles: the middle estimate large, the range small, and a bar
 * showing the estimate against your target (protein is a minimum, the rest maximums).
 */
export function MacroGrid({ range, targets, misses = [] }: { range: MacroRange; targets?: Targets; misses?: MacroKey[] }) {
  return (
    <div className="macros">
      {MACRO_ORDER.map((key) => {
        const target = targets?.[key] ?? null;
        const miss = misses.includes(key);
        const pct = target ? Math.min(100, Math.round((range.mid[key] / target) * 100)) : null;
        return (
          <div key={key} className={`macro ${key}${miss ? " miss" : ""}`}>
            <div className="l">{MACRO_LABEL[key]}</div>
            <div className="v">
              {range.mid[key]}
              <small>{key === "calories" ? "kcal" : "g"}</small>
            </div>
            {pct != null && (
              <div className="bar" aria-hidden>
                <div style={{ width: `${pct}%` }} />
              </div>
            )}
            <div className="r">
              {range.low[key]}–{range.high[key]}
              {target != null && (
                <>
                  {" · "}
                  {miss ? <b>{key === "protein" ? `under ${target}` : `over ${target}`}</b> : key === "protein" ? `min ${target}` : `max ${target}`}
                </>
              )}
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
