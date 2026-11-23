"use client";
import Link from "next/link";

import type { Targets } from "@/lib/matching";

import { useFitTargets } from "~/lib/use-fit-targets";

export function describeTargets(t: Targets): string {
  const parts: string[] = [];
  if (t.protein != null) parts.push(`${t.protein}g+ protein`);
  if (t.calories != null) parts.push(`under ${t.calories} kcal`);
  if (t.carbs != null) parts.push(`under ${t.carbs}g carbs`);
  if (t.fat != null) parts.push(`under ${t.fat}g fat`);
  return parts.length ? parts.join(", ") : "no targets set";
}

/** One line saying what dishes are being matched against, with a switch to "what's left today". */
export function TargetsSummary() {
  const { targets, mode, setMode, eaten, left } = useFitTargets();
  return (
    <div className="row small" style={{ gap: 12, rowGap: 8 }}>
      <div className="seg" role="group" aria-label="Match dishes to">
        <button className={mode === "meal" ? "on" : undefined} onClick={() => setMode("meal")}>
          Per meal
        </button>
        <button className={mode === "left" ? "on" : undefined} onClick={() => setMode("left")}>
          What&apos;s left today
        </button>
      </div>
      <span className="muted">
        {mode === "left" ? (eaten.calories === 0 ? "Nothing logged yet. Next meal: " : "Next meal: ") : null}
        {describeTargets(targets)}
        {mode === "left" && eaten.calories > 0 && left.calories != null ? ` (${Math.max(0, left.calories).toLocaleString("en-AU")} kcal left today)` : ""}.{" "}
        <Link href={mode === "left" ? "/today" : "/targets"} className="link">
          {mode === "left" ? "Today" : "Edit"}
        </Link>
      </span>
    </div>
  );
}
