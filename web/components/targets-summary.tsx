"use client";
import Link from "next/link";

import type { Targets } from "@/lib/matching";

export function describeTargets(t: Targets): string {
  const parts: string[] = [];
  if (t.protein != null) parts.push(`≥ ${t.protein}g protein`);
  if (t.calories != null) parts.push(`≤ ${t.calories} kcal`);
  if (t.carbs != null) parts.push(`≤ ${t.carbs}g carbs`);
  if (t.fat != null) parts.push(`≤ ${t.fat}g fat`);
  return parts.length ? parts.join(" · ") : "No targets set";
}

export function TargetsSummary({ targets }: { targets: Targets }) {
  return (
    <div className="card spread" style={{ padding: "10px 14px" }}>
      <div className="small">
        <span className="muted">Per meal: </span>
        <strong>{describeTargets(targets)}</strong>
      </div>
      <Link href="/targets" className="btn small">
        Edit targets
      </Link>
    </div>
  );
}
