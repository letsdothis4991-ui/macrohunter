"use client";
import { useMemo } from "react";

import { dayKey, leftToday, targetsForWhatsLeft, totalsFor } from "./daily";
import { useDaily, useLog, usePrefs, useTargets } from "./store";

/**
 * The targets dishes are ranked against. In "what's left today" mode the per-meal
 * targets shrink to whatever room is left in your daily totals.
 */
export function useFitTargets() {
  const [perMeal] = useTargets();
  const [daily] = useDaily();
  const [prefs, setPrefs] = usePrefs();
  const { log } = useLog();
  const today = dayKey();
  const eaten = useMemo(() => totalsFor(log.filter((e) => e.day === today)), [log, today]);
  const mode = prefs.fitTo ?? "meal";
  const targets = useMemo(() => (mode === "left" ? targetsForWhatsLeft(perMeal, daily, eaten) : perMeal), [mode, perMeal, daily, eaten]);
  const left = useMemo(() => leftToday(daily, eaten), [daily, eaten]);
  return {
    targets,
    perMeal,
    daily,
    eaten,
    left,
    mode,
    setMode: (m: "meal" | "left") => setPrefs((o) => ({ ...o, fitTo: m })),
  };
}
