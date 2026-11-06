// Local stand-ins for Google Places and the Claude API, so the whole site can be
// exercised end to end without real keys or spending money. Test-only.
import http from "node:http";

const PORT = Number(process.env.MOCK_PORT || 4010);

const places = [
  { id: "mock-cafe", displayName: { text: "Harbour Protein Café" }, shortFormattedAddress: "1 George St, Sydney", location: { latitude: -33.8725, longitude: 151.2068 }, primaryType: "cafe", types: ["cafe"], rating: 4.6, userRatingCount: 812, googleMapsUri: "https://maps.google.com/?cid=1", priceLevel: "PRICE_LEVEL_MODERATE", currentOpeningHours: { openNow: true }, websiteUri: "https://example.com/" },
  { id: "mock-thai", displayName: { text: "Little Bangkok" }, shortFormattedAddress: "20 Pitt St, Sydney", location: { latitude: -33.8745, longitude: 151.2085 }, primaryType: "thai_restaurant", types: ["restaurant"], rating: 4.2, userRatingCount: 301, googleMapsUri: "https://maps.google.com/?cid=2", priceLevel: "PRICE_LEVEL_INEXPENSIVE", currentOpeningHours: { openNow: false } },
];

const menu = {
  menuFound: true,
  cuisine: "Brunch",
  dishes: [
    { name: "Chicken power bowl", description: "Grilled chicken, brown rice, greens, avocado, tahini", priceAud: 19.5, category: "salad_or_bowl", clarity: "clear",
      portions: [{ ingredient: "chickenBreast", grams: 160 }, { ingredient: "brownRice", grams: 150 }, { ingredient: "saladLeaves", grams: 60 }, { ingredient: "avocado", grams: 40 }, { ingredient: "tahini", grams: 15 }, { ingredient: "oliveOil", grams: 5 }],
      tweaks: [{ label: "Double chicken", remove: [], add: [{ ingredient: "chickenBreast", grams: 120 }] }] },
    { name: "Big brekkie", description: "Eggs, bacon, sausage, hash brown, toast", priceAud: 26, category: "breakfast", clarity: "clear",
      portions: [{ ingredient: "egg", grams: 100 }, { ingredient: "bacon", grams: 60 }, { ingredient: "sausage", grams: 80 }, { ingredient: "hashBrown", grams: 70 }, { ingredient: "sourdough", grams: 80 }, { ingredient: "butter", grams: 10 }],
      tweaks: [{ label: "No hash brown or sausage", remove: ["hashBrown", "sausage"], add: [] }] },
    { name: "Salmon poke", description: "Salmon, sushi rice, edamame, sesame dressing", priceAud: 21, category: "salad_or_bowl", clarity: "clear",
      portions: [{ ingredient: "salmon", grams: 120 }, { ingredient: "sushiRice", grams: 180 }, { ingredient: "edamame", grams: 40 }, { ingredient: "sesameDressing", grams: 20 }], tweaks: [] },
    { name: "Chef's special", description: "Ask staff", priceAud: null, category: "main", clarity: "vague", portions: [], tweaks: [] },
  ],
};

const plate = {
  isFood: true,
  dishName: "Chicken power bowl",
  summary: "A large bowl with about 180 g of grilled chicken over brown rice and greens, with a generous drizzle of tahini.",
  confidence: "medium",
  portions: [{ ingredient: "chickenBreast", grams: 180 }, { ingredient: "brownRice", grams: 170 }, { ingredient: "saladLeaves", grams: 50 }, { ingredient: "avocado", grams: 30 }, { ingredient: "tahini", grams: 25 }, { ingredient: "oliveOil", grams: 8 }],
  unseen: ["Oil used to cook the chicken", "Salt and sugar in the dressing"],
  differences: ["More chicken than the menu estimate", "Less avocado than usual"],
};

function sse(res, json) {
  const text = JSON.stringify(json);
  const ev = (type, data) => res.write(`event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`);
  res.writeHead(200, { "Content-Type": "text/event-stream" });
  ev("message_start", { message: { id: "msg_mock", type: "message", role: "assistant", model: "claude-opus-5-5", content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 10, output_tokens: 1 } } });
  ev("content_block_start", { index: 0, content_block: { type: "text", text: "" } });
  for (let i = 0; i < text.length; i += 400) ev("content_block_delta", { index: 0, delta: { type: "text_delta", text: text.slice(i, i + 400) } });
  ev("content_block_stop", { index: 0 });
  ev("message_delta", { delta: { stop_reason: "end_turn", stop_sequence: null }, usage: { output_tokens: 100 } });
  ev("message_stop", {});
  res.end();
}

http
  .createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const url = new URL(req.url, "http://x");
      if (url.pathname.endsWith("/places:searchNearby")) {
        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ places }));
      }
      const m = url.pathname.match(/\/places\/(.+)$/);
      if (m) {
        const p = places.find((x) => x.id === decodeURIComponent(m[1]));
        res.writeHead(p ? 200 : 404, { "Content-Type": "application/json" });
        return res.end(JSON.stringify(p ?? { error: "not found" }));
      }
      if (url.pathname === "/v1/messages") {
        const isMenu = body.includes("estimate what is in dishes");
        const delay = isMenu ? 2500 : 1500;
        return setTimeout(() => sse(res, isMenu ? menu : plate), delay);
      }
      res.writeHead(404);
      res.end();
    });
  })
  .listen(PORT, () => console.log(`mock on ${PORT}`));
