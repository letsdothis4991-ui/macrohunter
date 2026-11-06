/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import { SAMPLE_CATALOGUE } from "../data/sample";
import {
  applyTweak,
  evaluateDish,
  matchMacros,
  rankResults,
  type Targets,
} from "./matching";
import { isIngredient, macrosFor, rangeFor } from "./nutrition";

const { venues: VENUES, dishes: DISHES } = SAMPLE_CATALOGUE;

const lean: Targets = { protein: 35, calories: 600, carbs: null, fat: 20 };

test("macros are computed from per-100g values", () => {
  // 200g chicken breast: 330 kcal, 62g protein, 0g carbs, 7.2g fat
  assert.deepEqual(macrosFor([{ ingredient: "chickenBreast", grams: 200 }]), {
    calories: 330,
    protein: 62,
    carbs: 0,
    fat: 7,
  });
});

test("estimated ranges are wider than chain ranges", () => {
  const mid = { calories: 500, protein: 40, carbs: 50, fat: 15 };
  const est = rangeFor(mid, "estimated");
  const chain = rangeFor(mid, "chain");
  assert.ok(
    est.high.calories - est.low.calories >
      chain.high.calories - chain.low.calories,
  );
  assert.equal(est.mid, mid);
});

test("a dish inside every target fits", () => {
  const m = matchMacros(
    rangeFor({ calories: 450, protein: 45, carbs: 30, fat: 12 }, "verified"),
    lean,
  );
  assert.equal(m.status, "fits");
  assert.equal(m.score, 100);
  assert.deepEqual(m.misses, []);
  assert.ok(m.fitsWorstCase);
});

test("an estimate near the limit fits on the middle but not the worst case", () => {
  const m = matchMacros(
    rangeFor({ calories: 590, protein: 36, carbs: 30, fat: 19 }, "estimated"),
    lean,
  );
  assert.equal(m.status, "fits");
  assert.equal(m.fitsWorstCase, false);
});

test("a small miss is close, a big miss is a miss", () => {
  const close = matchMacros(
    rangeFor({ calories: 640, protein: 40, carbs: 30, fat: 18 }, "chain"),
    lean,
  );
  assert.equal(close.status, "close");
  assert.deepEqual(close.misses, ["calories"]);
  const miss = matchMacros(
    rangeFor({ calories: 1200, protein: 20, carbs: 120, fat: 50 }, "chain"),
    lean,
  );
  assert.equal(miss.status, "miss");
});

test("unset targets are ignored", () => {
  const none: Targets = {
    protein: null,
    calories: null,
    carbs: null,
    fat: null,
  };
  const m = matchMacros(
    rangeFor({ calories: 2000, protein: 5, carbs: 300, fat: 90 }, "estimated"),
    none,
  );
  assert.equal(m.status, "fits");
});

test("a tweak that turns a miss into a fit is suggested", () => {
  const burger = DISHES.find((d) => d.id === "cg-burger")!;
  const result = evaluateDish(burger, "estimated", {
    protein: 40,
    calories: 850,
    carbs: null,
    fat: null,
  });
  assert.notEqual(result.match.status, "fits");
  assert.equal(
    result.fixingTweak?.tweak.label,
    "Lettuce wrap, no chips, no aioli",
  );
});

test("applyTweak removes and adds portions", () => {
  const out = applyTweak(
    [
      { ingredient: "whiteRice", grams: 200 },
      { ingredient: "tunaRaw", grams: 100 },
    ],
    {
      label: "half rice",
      remove: ["whiteRice"],
      add: [{ ingredient: "whiteRice", grams: 100 }],
    },
  );
  assert.deepEqual(out, [
    { ingredient: "tunaRaw", grams: 100 },
    { ingredient: "whiteRice", grams: 100 },
  ]);
});

test("ranking puts fits first, then nearer dishes on ties", () => {
  const fit = matchMacros(
    rangeFor({ calories: 400, protein: 40, carbs: 20, fat: 10 }, "chain"),
    lean,
  );
  const miss = matchMacros(
    rangeFor({ calories: 1200, protein: 20, carbs: 20, fat: 60 }, "chain"),
    lean,
  );
  const base = {
    dish: DISHES[0],
    range: rangeFor({ calories: 0, protein: 0, carbs: 0, fat: 0 }, "chain"),
  };
  const ranked = rankResults([
    { ...base, match: miss, distanceKm: 0.1, tag: "miss" },
    { ...base, match: fit, distanceKm: 0.9, tag: "far fit" },
    { ...base, match: fit, distanceKm: 0.2, tag: "near fit" },
  ]);
  assert.deepEqual(
    ranked.map((r) => r.tag),
    ["near fit", "far fit", "miss"],
  );
});

test("sample data is consistent", () => {
  const venueIds = new Set(VENUES.map((v) => v.id));
  const dishIds = new Set<string>();
  for (const d of DISHES) {
    assert.ok(
      venueIds.has(d.venueId),
      `${d.id} has unknown venue ${d.venueId}`,
    );
    assert.ok(!dishIds.has(d.id), `duplicate dish id ${d.id}`);
    dishIds.add(d.id);
    for (const p of d.portions) assert.ok(isIngredient(p.ingredient));
  }
});
