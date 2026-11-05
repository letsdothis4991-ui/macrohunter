import type { Targets } from "@/lib/matching";
import type { MacroKey, MacroRange } from "@/lib/nutrition";

import { MACRO_LABEL, MACRO_ORDER, unit } from "./badges";

const COLOR: Record<MacroKey, string> = {
  calories: "var(--calories)",
  protein: "var(--protein)",
  carbs: "var(--carbs)",
  fat: "var(--fat)",
};

function targetFor(t: Targets | undefined, key: MacroKey): number | null {
  return t ? t[key] : null;
}

/** Four tiles: the middle estimate, the range, and a bar showing the range against your target. */
export function MacroGrid({ range, targets, misses = [] }: { range: MacroRange; targets?: Targets; misses?: MacroKey[] }) {
  return (
    <div className="macro-grid">
      {MACRO_ORDER.map((key) => {
        const target = targetFor(targets, key);
        const max = Math.max(range.high[key], target ?? 0) * 1.15 || 1;
        const pct = (v: number) => `${Math.min(100, (v / max) * 100)}%`;
        return (
          <div key={key} className={`macro${misses.includes(key) ? " miss" : ""}`}>
            <div className="label">{MACRO_LABEL[key]}</div>
            <div className="value">
              {range.mid[key]}
              {unit(key)}
            </div>
            <div className="range">
              {range.low[key]}–{range.high[key]}
              {unit(key)}
              {target != null && (
                <span title="Your target">
                  {" "}
                  · {key === "protein" ? "≥" : "≤"}
                  {target}
                </span>
              )}
            </div>
            <div className="bar" aria-hidden>
              <div
                className="band"
                style={{ left: pct(range.low[key]), width: `calc(${pct(range.high[key])} - ${pct(range.low[key])})`, background: COLOR[key] }}
              />
              {target != null && <div className="target" style={{ left: pct(target) }} />}
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
    <span className="small muted" style={{ fontVariantNumeric: "tabular-nums" }}>
      {m.calories} kcal · <span style={{ color: "var(--protein)" }}>P {m.protein}g</span> · C {m.carbs}g · F {m.fat}g
    </span>
  );
}
