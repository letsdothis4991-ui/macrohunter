import assert from "node:assert/strict";
import { test } from "node:test";

import { PLATE_SPREAD, rangeWithSpread, slug } from "./macros";

test("plate ranges widen as confidence drops", () => {
  const portions = [{ ingredient: "chickenBreast" as const, grams: 200 }];
  const high = rangeWithSpread(portions, PLATE_SPREAD.high);
  const low = rangeWithSpread(portions, PLATE_SPREAD.low);
  assert.equal(high.mid.protein, 62); // 31 g per 100 g
  assert.ok(low.high.calories - low.low.calories > high.high.calories - high.low.calories);
  assert.ok(high.low.protein < high.mid.protein && high.mid.protein < high.high.protein);
});

test("dish slugs are url-safe", () => {
  assert.equal(slug("Smashed Avo & Feta (V)"), "smashed-avo-feta-v");
  assert.equal(slug("Café crème brûlée"), "cafe-creme-brulee");
  assert.equal(slug("!!!"), "dish");
});
