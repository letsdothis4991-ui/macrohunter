import assert from "node:assert/strict";
import { test } from "node:test";

import { logToCsv, trackerText } from "./export";

test("tracker text is one pasteable line", () => {
  assert.equal(
    trackerText("Salmon poke", { calories: 646.4, protein: 36, carbs: 66, fat: 26 }, "Harbour Café"),
    "Salmon poke (Harbour Café): 646 kcal, 36g protein, 66g carbs, 26g fat",
  );
});

test("CSV escapes commas and quotes and sorts by time", () => {
  const csv = logToCsv([
    { id: "2", day: "2026-11-08", at: "2026-11-08T08:00:00", name: 'Bowl "large", extra', source: "menu", macros: { calories: 700, protein: 50, carbs: 60, fat: 20 } },
    { id: "1", day: "2026-11-08", at: "2026-11-08T07:00:00", name: "Coffee", source: "manual", macros: { calories: 120, protein: 6, carbs: 10, fat: 6 } },
  ]);
  const lines = csv.trim().split("\r\n");
  assert.equal(lines[0], "Date,Time,Meal,Place,Calories (kcal),Protein (g),Carbs (g),Fat (g),Source");
  assert.equal(lines[1], "2026-11-08,07:00,Coffee,,120,6,10,6,manual");
  assert.equal(lines[2], '2026-11-08,08:00,"Bowl ""large"", extra",,700,50,60,20,menu');
});
