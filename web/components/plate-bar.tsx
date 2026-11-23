import type { Macros } from "@/lib/nutrition";

/**
 * Where a dish's calories come from: protein and carbs at 4 kcal per gram, fat at 9.
 * Every dish gets one, so you can compare plates at a glance.
 */
export function PlateBar({ macros, thin }: { macros: Macros; thin?: boolean }) {
  const p = macros.protein * 4;
  const c = macros.carbs * 4;
  const f = macros.fat * 9;
  const total = p + c + f || 1;
  const pct = (n: number) => `${Math.round((n / total) * 1000) / 10}%`;
  const label = `Calories from protein ${Math.round((p / total) * 100)}%, carbs ${Math.round((c / total) * 100)}%, fat ${Math.round((f / total) * 100)}%`;
  return (
    <div className={`plate-bar${thin ? " thin" : ""}`} role="img" aria-label={label} title={label}>
      <span className="seg-protein" style={{ width: pct(p) }} />
      <span className="seg-carbs" style={{ width: pct(c) }} />
      <span className="seg-fat" style={{ width: pct(f) }} />
    </div>
  );
}
