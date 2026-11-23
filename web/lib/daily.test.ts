import assert from "node:assert/strict";
import { test } from "node:test";

import { dayKey, leftToday, shiftDay, targetsForWhatsLeft, totalsFor, type LogEntry } from "./daily";

const entry = (calories: number, protein: number, carbs: number, fat: number): LogEntry => ({
  id: String(Math.random()),
  day: "2026-11-08",
  at: "",
  name: "x",
  source: "manual",
  macros: { calories, protein, carbs, fat },
});

test("dayKey and shiftDay use the local calendar", () => {
  assert.equal(dayKey(new Date(2026, 10, 8, 23, 59)), "2026-11-08");
  assert.equal(shiftDay("2026-11-01", -1), "2026-10-31");
  assert.equal(shiftDay("2026-12-31", 1), "2027-01-01");
});

test("totals add up and round", () => {
  assert.deepEqual(totalsFor([entry(500.4, 30, 40, 10), entry(300.4, 20.6, 10, 5)]), { calories: 801, protein: 51, carbs: 50, fat: 15 });
});

test("left today is null where no daily total is set", () => {
  const left = leftToday({ calories: 2000, protein: 120, carbs: null, fat: 70 }, { calories: 2100, protein: 50, carbs: 100, fat: 20 });
  assert.deepEqual(left, { calories: -100, protein: 70, carbs: null, fat: 50 });
});

test("next-meal targets shrink to what is left", () => {
  const perMeal = { protein: 35, calories: 650, carbs: null, fat: 25 };
  const daily = { protein: 120, calories: 2000, carbs: null, fat: 70 };
  // Nothing eaten: per-meal targets stand.
  assert.deepEqual(targetsForWhatsLeft(perMeal, daily, { calories: 0, protein: 0, carbs: 0, fat: 0 }), perMeal);
  // Late in the day: 400 kcal and 20g protein to go, fat almost used up.
  assert.deepEqual(targetsForWhatsLeft(perMeal, daily, { calories: 1600, protein: 100, carbs: 150, fat: 60 }), {
    protein: 20,
    calories: 400,
    carbs: null,
    fat: 10,
  });
  // Over on calories, protein already hit.
  assert.deepEqual(targetsForWhatsLeft(perMeal, daily, { calories: 2200, protein: 130, carbs: 0, fat: 80 }), {
    protein: null,
    calories: 0,
    carbs: null,
    fat: 0,
  });
});
