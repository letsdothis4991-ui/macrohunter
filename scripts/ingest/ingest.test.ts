/// <reference types="node" />
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";

import { distanceKm } from "../../src/lib/geo";
import { buildCatalogue, reportCsv } from "./catalogue";
import { cleanEstimate, type MenuEstimate } from "./estimate";
import {
  fetchWebsiteMenu,
  findMenuLinks,
  htmlToText,
  readManualMenu,
} from "./menu";
import {
  coveringCircles,
  cuisineFromType,
  discoverPlaces,
  kindFor,
  type Place,
} from "./places";

const place: Place = {
  placeId: "ChIJabcdef123456",
  name: "Iron & Oat",
  address: "12 Crown St, Surry Hills",
  lat: -33.885,
  lng: 151.212,
  primaryType: "cafe",
  types: ["cafe", "food"],
  website: "https://ironandoat.example",
};

test("htmlToText keeps menu text and drops scripts", () => {
  const text = htmlToText(
    "<html><head><title>x</title></head><body><script>var a=1</script><h2>Breakfast</h2><p>Eggs &amp; bacon <b>$18</b></p><ul><li>Toast</li></ul></body></html>",
  );
  assert.equal(text, "Breakfast\nEggs & bacon $18\nToast");
});

test("findMenuLinks ranks food menu PDFs, then menu pages on the venue's site", () => {
  const html = `
    <a href="/about">About</a>
    <a href="/menu">Our menu</a>
    <a href="https://cdn.example.com/files/food-menu.pdf">Download</a>
    <a href="https://other.example/menu">Elsewhere</a>
    <a href="/drinks-menu">Drinks</a>
    <a href="/menu#lunch">Lunch</a>`;
  assert.deepEqual(findMenuLinks(html, "https://cafe.example/"), [
    "https://cdn.example.com/files/food-menu.pdf",
    "https://cafe.example/menu",
    "https://cafe.example/drinks-menu",
  ]);
});

test("fetchWebsiteMenu follows menu links and skips sites with no menu", async () => {
  const pages: Record<string, string> = {
    "https://cafe.example/":
      '<a href="/menu">Menu</a><p>Welcome to our café.</p>',
    "https://cafe.example/menu": `<h1>Menu</h1>${"<p>Smashed avo on sourdough with feta $21</p>".repeat(20)}`,
    "https://empty.example/": "<p>Coming soon</p>",
  };
  const fakeFetch = (async (url: string) =>
    new Response(pages[url] ?? "", {
      status: pages[url] ? 200 : 404,
      headers: { "content-type": "text/html" },
    })) as unknown as typeof fetch;
  const menu = await fetchWebsiteMenu("https://cafe.example/", fakeFetch);
  assert.equal(menu?.parts.length, 2);
  assert.match(
    menu?.parts[1].kind === "text" ? menu.parts[1].text : "",
    /Smashed avo/,
  );
  assert.equal(
    await fetchWebsiteMenu("https://empty.example/", fakeFetch),
    null,
  );
});

test("manual menu files are matched by place id or name slug", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "menus-"));
  await writeFile(path.join(dir, "iron-and-oat.txt"), "Big breakfast $24");
  await writeFile(path.join(dir, "iron-and-oat-2.png"), Buffer.from([1, 2, 3]));
  await writeFile(path.join(dir, "someone-else.txt"), "nope");
  const menu = await readManualMenu(dir, [place.placeId, "iron-and-oat"]);
  assert.equal(menu?.source, "manual");
  assert.deepEqual(
    menu?.parts.map((p) => p.kind),
    ["image", "text"],
  );
});

test("covering circles reach every edge of the area", () => {
  const centre = { lat: -33.8866, lng: 151.2115 };
  const circles = coveringCircles(centre, 1, 0.3);
  for (const bearing of [0, 45, 90, 135, 180, 225, 270, 315]) {
    const rad = (bearing * Math.PI) / 180;
    const edge = {
      lat: centre.lat + (0.99 * Math.cos(rad)) / 110.574,
      lng:
        centre.lng +
        (0.99 * Math.sin(rad)) /
          (111.32 * Math.cos((centre.lat * Math.PI) / 180)),
    };
    assert.ok(
      circles.some((c) => distanceKm(c, edge) <= 0.3),
      `edge at ${bearing}° is not covered`,
    );
  }
  assert.deepEqual(coveringCircles(centre, 0.2, 0.3), [centre]);
});

test("discoverPlaces de-duplicates, drops closed venues and sorts by distance", async () => {
  const calls: unknown[] = [];
  const fakeFetch = (async (_url: string, init: RequestInit) => {
    calls.push(JSON.parse(String(init.body)));
    return Response.json({
      places: [
        {
          id: "far",
          displayName: { text: "Far" },
          location: { latitude: -33.8905, longitude: 151.2115 },
          primaryType: "restaurant",
        },
        {
          id: "near",
          displayName: { text: "Near" },
          location: { latitude: -33.8867, longitude: 151.2115 },
          primaryType: "cafe",
        },
        {
          id: "shut",
          displayName: { text: "Shut" },
          location: { latitude: -33.8866, longitude: 151.2116 },
          businessStatus: "CLOSED_PERMANENTLY",
        },
      ],
    });
  }) as unknown as typeof fetch;
  const found = await discoverPlaces(
    { lat: -33.8866, lng: 151.2115 },
    0.6,
    "key",
    () => {},
    fakeFetch,
  );
  assert.deepEqual(
    found.map((p) => p.placeId),
    ["near", "far"],
  );
  assert.ok(calls.length > 1);
});

test("venue kind and cuisine come from Google place types", () => {
  assert.equal(kindFor({ primaryType: "cafe", types: [] }), "Café");
  assert.equal(
    kindFor({ primaryType: "fast_food_restaurant", types: ["meal_takeaway"] }),
    "Takeaway",
  );
  assert.equal(kindFor({ primaryType: "juice_shop", types: [] }), "Juice bar");
  assert.equal(
    kindFor({ primaryType: "korean_restaurant", types: ["restaurant"] }),
    "Restaurant",
  );
  assert.equal(cuisineFromType("korean_restaurant"), "Korean");
  assert.equal(cuisineFromType("middle_eastern_restaurant"), "Middle Eastern");
  assert.equal(cuisineFromType("fast_food_restaurant"), null);
  assert.equal(cuisineFromType("cafe"), null);
});

const estimate: MenuEstimate = {
  menuFound: true,
  cuisine: "Brunch",
  dishes: [
    {
      name: "Big breakfast",
      description: "Eggs, bacon, toast",
      priceAud: 24,
      category: "breakfast",
      clarity: "clear",
      portions: [
        { ingredient: "egg", grams: 100 },
        { ingredient: "egg", grams: 50 },
        { ingredient: "bacon", grams: 80 },
        { ingredient: "sourdough", grams: 0 },
      ],
      tweaks: [
        {
          label: "Add avocado",
          remove: [],
          add: [{ ingredient: "avocado", grams: 60 }],
        },
        { label: "Nothing", remove: [], add: [] },
      ],
    },
    {
      name: "Big breakfast",
      description: "dupe",
      priceAud: 24,
      category: "breakfast",
      clarity: "clear",
      portions: [{ ingredient: "egg", grams: 100 }],
      tweaks: [],
    },
    {
      name: "Chef's special",
      description: "Ask staff",
      priceAud: null,
      category: "main",
      clarity: "vague",
      portions: [],
      tweaks: [],
    },
    {
      name: "Mega shake",
      description: "Huge",
      priceAud: 9000,
      category: "shake_or_smoothie",
      clarity: "clear",
      portions: [{ ingredient: "milk", grams: 2500 }],
      tweaks: [],
    },
  ],
};

test("cleanEstimate merges portions and drops vague, duplicate and implausible dishes", () => {
  const { dishes, rejected } = cleanEstimate(estimate);
  assert.equal(dishes.length, 1);
  assert.deepEqual(dishes[0].portions, [
    { ingredient: "egg", grams: 150 },
    { ingredient: "bacon", grams: 80 },
  ]);
  assert.deepEqual(
    dishes[0].tweaks.map((t) => t.label),
    ["Add avocado"],
  );
  assert.deepEqual(
    rejected.map((r) => r.name),
    ["Chef's special", "Mega shake"],
  );
});

test("buildCatalogue makes stable ids and a spot-check CSV", () => {
  const { dishes } = cleanEstimate(estimate);
  const area = {
    name: "Surry Hills",
    lat: -33.8866,
    lng: 151.2115,
    radiusKm: 0.8,
  };
  const catalogue = buildCatalogue(
    area,
    [{ place, menuSource: place.website!, cuisine: "Brunch", dishes }],
    "2026-10-28T00:00:00Z",
  );
  assert.equal(catalogue.venues[0].id, "iron-and-oat-123456");
  assert.equal(catalogue.venues[0].kind, "Café");
  assert.equal(catalogue.venues[0].confidence, "estimated");
  assert.equal(catalogue.dishes[0].id, "iron-and-oat-123456-big-breakfast");
  const csv = reportCsv(catalogue).split("\n");
  assert.equal(
    csv[1],
    "Iron & Oat,Big breakfast,24,457,42,2,31,egg 150g; bacon 80g,https://ironandoat.example",
  );
});
