"use client";
import Link from "next/link";

import type { Targets } from "@/lib/matching";

export function describeTargets(t: Targets): string {
  const parts: string[] = [];
  if (t.protein != null) parts.push(`${t.protein}g+ protein`);
  if (t.calories != null) parts.push(`under ${t.calories} kcal`);
  if (t.carbs != null) parts.push(`under ${t.carbs}g carbs`);
  if (t.fat != null) parts.push(`under ${t.fat}g fat`);
  return parts.length ? parts.join(", ") : "no targets set";
}

export function TargetsSummary({ targets }: { targets: Targets }) {
  return (
    <p className="small muted">
      Per meal: {describeTargets(targets)}.{" "}
      <Link href="/targets" className="link">
        Edit
      </Link>
    </p>
  );
}
