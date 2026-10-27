/**
 * Sample data for the Surry Hills test area. Venues are fictional so that no real
 * business is shown with made-up numbers. Replace with the Supabase-backed catalogue
 * once the data pipeline is running.
 */
import type { Dish } from "@/lib/matching";
import type { Confidence } from "@/lib/nutrition";

export type VenueKind = "Café" | "Restaurant" | "Takeaway" | "Juice bar";

export type Venue = {
  id: string;
  name: string;
  kind: VenueKind;
  cuisine: string;
  address: string;
  lat: number;
  lng: number;
  confidence: Confidence;
};

export const VENUES: Venue[] = [
  {
    id: "iron-oat",
    name: "Iron & Oat",
    kind: "Café",
    cuisine: "Brunch",
    address: "Crown St, Surry Hills",
    lat: -33.8851,
    lng: 151.2123,
    confidence: "estimated",
  },
  {
    id: "green-bowl",
    name: "Green Bowl Co.",
    kind: "Takeaway",
    cuisine: "Salads & bowls",
    address: "Foveaux St, Surry Hills",
    lat: -33.8838,
    lng: 151.2108,
    confidence: "verified",
  },
  {
    id: "crown-grill",
    name: "Crown Street Grill",
    kind: "Restaurant",
    cuisine: "Grill",
    address: "Crown St, Surry Hills",
    lat: -33.8879,
    lng: 151.2131,
    confidence: "estimated",
  },
  {
    id: "little-seoul",
    name: "Little Seoul Kitchen",
    kind: "Restaurant",
    cuisine: "Korean",
    address: "Campbell St, Surry Hills",
    lat: -33.8842,
    lng: 151.2096,
    confidence: "estimated",
  },
  {
    id: "burrito-barn",
    name: "Burrito Barn",
    kind: "Takeaway",
    cuisine: "Mexican",
    address: "Oxford St, Darlinghurst",
    lat: -33.8818,
    lng: 151.2152,
    confidence: "chain",
  },
  {
    id: "harbour-poke",
    name: "Harbour Poke",
    kind: "Takeaway",
    cuisine: "Poke",
    address: "Elizabeth St, Surry Hills",
    lat: -33.8862,
    lng: 151.2079,
    confidence: "estimated",
  },
  {
    id: "daily-grind",
    name: "The Daily Grind",
    kind: "Café",
    cuisine: "Café",
    address: "Bourke St, Surry Hills",
    lat: -33.8893,
    lng: 151.2142,
    confidence: "estimated",
  },
  {
    id: "fuel-bar",
    name: "Fuel Smoothie Bar",
    kind: "Juice bar",
    cuisine: "Smoothies",
    address: "Riley St, Surry Hills",
    lat: -33.8848,
    lng: 151.2141,
    confidence: "verified",
  },
  {
    id: "nonnas",
    name: "Nonna's Pasta Bar",
    kind: "Restaurant",
    cuisine: "Italian",
    address: "Commonwealth St, Surry Hills",
    lat: -33.8831,
    lng: 151.2104,
    confidence: "estimated",
  },
  {
    id: "falafel-rep",
    name: "Falafel Republic",
    kind: "Takeaway",
    cuisine: "Middle Eastern",
    address: "Cleveland St, Surry Hills",
    lat: -33.8903,
    lng: 151.2117,
    confidence: "estimated",
  },
];

export const DISHES: Dish[] = [
  // Iron & Oat
  {
    id: "io-protein-brekkie",
    venueId: "iron-oat",
    name: "Protein brekkie plate",
    priceAud: 26,
    description:
      "Three poached eggs, bacon, sautéed spinach and mushrooms, one slice sourdough.",
    portions: [
      { ingredient: "egg", grams: 150 },
      { ingredient: "bacon", grams: 80 },
      { ingredient: "spinach", grams: 60 },
      { ingredient: "mushrooms", grams: 80 },
      { ingredient: "sourdough", grams: 50 },
      { ingredient: "oliveOil", grams: 8 },
    ],
    tweaks: [{ label: "Skip the sourdough", remove: ["sourdough"] }],
  },
  {
    id: "io-salmon-benny",
    venueId: "iron-oat",
    name: "Smoked salmon benedict",
    priceAud: 25,
    description:
      "Two poached eggs, smoked salmon and hollandaise on sourdough.",
    portions: [
      { ingredient: "egg", grams: 100 },
      { ingredient: "smokedSalmon", grams: 70 },
      { ingredient: "hollandaise", grams: 50 },
      { ingredient: "sourdough", grams: 100 },
      { ingredient: "spinach", grams: 30 },
    ],
    tweaks: [
      {
        label: "Hollandaise on the side (half)",
        remove: ["hollandaise"],
        add: [{ ingredient: "hollandaise", grams: 25 }],
      },
    ],
  },
  {
    id: "io-ricotta-hotcakes",
    venueId: "iron-oat",
    name: "Ricotta hotcakes",
    priceAud: 23,
    description: "Two ricotta hotcakes with berries, Greek yoghurt and maple.",
    portions: [
      { ingredient: "pancake", grams: 220 },
      { ingredient: "ricotta", grams: 50 },
      { ingredient: "berries", grams: 80 },
      { ingredient: "greekYoghurt", grams: 60 },
      { ingredient: "maple", grams: 30 },
    ],
  },
  {
    id: "io-avo-toast",
    venueId: "iron-oat",
    name: "Smashed avo with feta",
    priceAud: 21,
    description:
      "Smashed avocado and feta on two slices of sourdough. Add a poached egg.",
    portions: [
      { ingredient: "avocado", grams: 100 },
      { ingredient: "feta", grams: 30 },
      { ingredient: "sourdough", grams: 100 },
      { ingredient: "oliveOil", grams: 5 },
    ],
    tweaks: [
      {
        label: "Add two poached eggs",
        add: [{ ingredient: "egg", grams: 100 }],
      },
    ],
  },

  // Green Bowl Co. (venue-verified)
  {
    id: "gb-chicken-quinoa",
    venueId: "green-bowl",
    name: "Chicken & quinoa bowl",
    priceAud: 19,
    description:
      "Grilled chicken, quinoa, roast sweet potato, leaves, lemon-olive oil dressing.",
    portions: [
      { ingredient: "chickenBreast", grams: 160 },
      { ingredient: "quinoa", grams: 120 },
      { ingredient: "sweetPotato", grams: 100 },
      { ingredient: "saladLeaves", grams: 60 },
      { ingredient: "oliveOil", grams: 8 },
    ],
    tweaks: [
      {
        label: "Double chicken (+$6)",
        add: [{ ingredient: "chickenBreast", grams: 160 }],
      },
    ],
  },
  {
    id: "gb-halloumi",
    venueId: "green-bowl",
    name: "Halloumi & avocado salad",
    priceAud: 18,
    description:
      "Grilled halloumi, avocado, leaves, quinoa and pesto dressing.",
    portions: [
      { ingredient: "halloumi", grams: 100 },
      { ingredient: "avocado", grams: 60 },
      { ingredient: "saladLeaves", grams: 80 },
      { ingredient: "quinoa", grams: 80 },
      { ingredient: "pesto", grams: 20 },
    ],
    tweaks: [
      {
        label: "Swap halloumi for chicken",
        remove: ["halloumi"],
        add: [{ ingredient: "chickenBreast", grams: 140 }],
      },
    ],
  },
  {
    id: "gb-steak-salad",
    venueId: "green-bowl",
    name: "Steak & greens",
    priceAud: 22,
    description: "Sliced sirloin, leaves, brown rice and soft-boiled egg.",
    portions: [
      { ingredient: "beefSteak", grams: 150 },
      { ingredient: "saladLeaves", grams: 80 },
      { ingredient: "brownRice", grams: 120 },
      { ingredient: "egg", grams: 50 },
      { ingredient: "oliveOil", grams: 6 },
    ],
  },

  // Crown Street Grill
  {
    id: "cg-burger",
    venueId: "crown-grill",
    name: "Double cheeseburger & chips",
    priceAud: 27,
    description:
      "Two beef patties, cheddar, aioli and pickles on a brioche-style bun, with chips.",
    portions: [
      { ingredient: "beefPatty", grams: 240 },
      { ingredient: "cheddar", grams: 40 },
      { ingredient: "burgerBun", grams: 90 },
      { ingredient: "aioli", grams: 25 },
      { ingredient: "chips", grams: 180 },
    ],
    tweaks: [
      {
        label: "Salad instead of chips",
        remove: ["chips"],
        add: [{ ingredient: "saladLeaves", grams: 100 }],
      },
      {
        label: "Lettuce wrap, no chips, no aioli",
        remove: ["burgerBun", "chips", "aioli"],
        add: [{ ingredient: "saladLeaves", grams: 100 }],
      },
    ],
  },
  {
    id: "cg-steak",
    venueId: "crown-grill",
    name: "300g sirloin with greens",
    priceAud: 42,
    description: "Grilled sirloin, buttered greens and a side of chips.",
    portions: [
      { ingredient: "beefSteak", grams: 300 },
      { ingredient: "spinach", grams: 100 },
      { ingredient: "oliveOil", grams: 10 },
      { ingredient: "chips", grams: 150 },
    ],
    tweaks: [{ label: "Skip the chips", remove: ["chips"] }],
  },
  {
    id: "cg-salmon",
    venueId: "crown-grill",
    name: "Grilled salmon, sweet potato",
    priceAud: 36,
    description: "Salmon fillet with roast sweet potato and leaves.",
    portions: [
      { ingredient: "salmon", grams: 180 },
      { ingredient: "sweetPotato", grams: 150 },
      { ingredient: "saladLeaves", grams: 60 },
      { ingredient: "oliveOil", grams: 8 },
    ],
  },

  // Little Seoul Kitchen
  {
    id: "ls-bibimbap",
    venueId: "little-seoul",
    name: "Beef bibimbap",
    priceAud: 22,
    description:
      "Rice with marinated beef mince, spinach, kimchi and a fried egg.",
    portions: [
      { ingredient: "whiteRice", grams: 250 },
      { ingredient: "beefMince", grams: 120 },
      { ingredient: "spinach", grams: 50 },
      { ingredient: "kimchi", grams: 50 },
      { ingredient: "egg", grams: 50 },
      { ingredient: "oliveOil", grams: 10 },
    ],
    tweaks: [
      {
        label: "Half rice",
        remove: ["whiteRice"],
        add: [{ ingredient: "whiteRice", grams: 125 }],
      },
    ],
  },
  {
    id: "ls-tofu",
    venueId: "little-seoul",
    name: "Spicy tofu stew",
    priceAud: 20,
    description: "Soft tofu, egg and kimchi stew with a small rice.",
    portions: [
      { ingredient: "tofu", grams: 250 },
      { ingredient: "egg", grams: 50 },
      { ingredient: "kimchi", grams: 80 },
      { ingredient: "whiteRice", grams: 150 },
    ],
  },

  // Burrito Barn (chain-published)
  {
    id: "bb-chicken-bowl",
    venueId: "burrito-barn",
    name: "Chicken burrito bowl",
    priceAud: 17,
    description: "Chicken, brown rice, black beans, salsa and leaves.",
    portions: [
      { ingredient: "chickenBreast", grams: 150 },
      { ingredient: "brownRice", grams: 150 },
      { ingredient: "blackBeans", grams: 80 },
      { ingredient: "tomatoSauce", grams: 50 },
      { ingredient: "saladLeaves", grams: 40 },
    ],
    tweaks: [
      { label: "Add guacamole", add: [{ ingredient: "avocado", grams: 60 }] },
    ],
  },
  {
    id: "bb-beef-burrito",
    venueId: "burrito-barn",
    name: "Beef & cheese burrito",
    priceAud: 18,
    description: "Beef mince, rice, beans and cheddar in a large tortilla.",
    portions: [
      { ingredient: "beefMince", grams: 130 },
      { ingredient: "whiteRice", grams: 120 },
      { ingredient: "blackBeans", grams: 60 },
      { ingredient: "cheddar", grams: 30 },
      { ingredient: "tortilla", grams: 100 },
    ],
    tweaks: [{ label: "Make it a bowl (no tortilla)", remove: ["tortilla"] }],
  },

  // Harbour Poke
  {
    id: "hp-tuna",
    venueId: "harbour-poke",
    name: "Classic tuna poke",
    priceAud: 20,
    description: "Raw tuna, sushi rice, edamame, avocado and sesame dressing.",
    portions: [
      { ingredient: "tunaRaw", grams: 140 },
      { ingredient: "whiteRice", grams: 180 },
      { ingredient: "edamame", grams: 50 },
      { ingredient: "avocado", grams: 40 },
      { ingredient: "sesameDressing", grams: 20 },
    ],
    tweaks: [
      {
        label: "Leaves instead of rice",
        remove: ["whiteRice"],
        add: [{ ingredient: "saladLeaves", grams: 100 }],
      },
    ],
  },
  {
    id: "hp-teriyaki",
    venueId: "harbour-poke",
    name: "Teriyaki chicken poke",
    priceAud: 19,
    description: "Teriyaki chicken, brown rice, edamame and leaves.",
    portions: [
      { ingredient: "chickenBreast", grams: 140 },
      { ingredient: "teriyaki", grams: 40 },
      { ingredient: "brownRice", grams: 180 },
      { ingredient: "edamame", grams: 50 },
      { ingredient: "saladLeaves", grams: 30 },
    ],
  },

  // The Daily Grind
  {
    id: "dg-yoghurt",
    venueId: "daily-grind",
    name: "Greek yoghurt & granola",
    priceAud: 15,
    description: "Greek yoghurt, house granola and berries.",
    portions: [
      { ingredient: "greekYoghurt", grams: 200 },
      { ingredient: "granola", grams: 60 },
      { ingredient: "berries", grams: 80 },
    ],
  },
  {
    id: "dg-omelette",
    venueId: "daily-grind",
    name: "Egg white omelette",
    priceAud: 19,
    description:
      "Egg whites, spinach, mushrooms and feta, with one slice of toast.",
    portions: [
      { ingredient: "eggWhite", grams: 250 },
      { ingredient: "spinach", grams: 50 },
      { ingredient: "mushrooms", grams: 60 },
      { ingredient: "feta", grams: 30 },
      { ingredient: "sourdough", grams: 50 },
    ],
  },
  {
    id: "dg-chicken-toastie",
    venueId: "daily-grind",
    name: "Chicken & cheese toastie",
    priceAud: 16,
    description: "Shredded chicken, cheddar and pesto on sourdough.",
    portions: [
      { ingredient: "chickenBreast", grams: 100 },
      { ingredient: "cheddar", grams: 40 },
      { ingredient: "pesto", grams: 15 },
      { ingredient: "sourdough", grams: 120 },
    ],
  },

  // Fuel Smoothie Bar (venue-verified)
  {
    id: "fb-pb-shake",
    venueId: "fuel-bar",
    name: "PB banana protein shake",
    priceAud: 13,
    description: "Whey protein, banana, peanut butter, oats and milk.",
    portions: [
      { ingredient: "wheyProtein", grams: 40 },
      { ingredient: "banana", grams: 100 },
      { ingredient: "peanutButter", grams: 20 },
      { ingredient: "oats", grams: 30 },
      { ingredient: "milk", grams: 350 },
    ],
    tweaks: [{ label: "No peanut butter", remove: ["peanutButter"] }],
  },
  {
    id: "fb-berry-shake",
    venueId: "fuel-bar",
    name: "Berry protein smoothie",
    priceAud: 12,
    description: "Whey protein, mixed berries, Greek yoghurt and milk.",
    portions: [
      { ingredient: "wheyProtein", grams: 35 },
      { ingredient: "berries", grams: 120 },
      { ingredient: "greekYoghurt", grams: 100 },
      { ingredient: "milk", grams: 250 },
    ],
  },

  // Nonna's Pasta Bar
  {
    id: "np-bolognese",
    venueId: "nonnas",
    name: "Spaghetti bolognese",
    priceAud: 26,
    description: "Spaghetti with beef ragù and parmesan.",
    portions: [
      { ingredient: "pasta", grams: 300 },
      { ingredient: "beefMince", grams: 120 },
      { ingredient: "tomatoSauce", grams: 150 },
      { ingredient: "cheddar", grams: 15 },
      { ingredient: "oliveOil", grams: 10 },
    ],
  },
  {
    id: "np-pesto-chicken",
    venueId: "nonnas",
    name: "Pesto chicken penne",
    priceAud: 27,
    description: "Penne with grilled chicken, pesto and spinach.",
    portions: [
      { ingredient: "pasta", grams: 280 },
      { ingredient: "chickenBreast", grams: 120 },
      { ingredient: "pesto", grams: 40 },
      { ingredient: "spinach", grams: 40 },
    ],
  },

  // Falafel Republic
  {
    id: "fr-falafel-wrap",
    venueId: "falafel-rep",
    name: "Falafel wrap",
    priceAud: 14,
    description: "Falafel, hummus, salad and tahini in a wrap.",
    portions: [
      { ingredient: "falafel", grams: 120 },
      { ingredient: "hummus", grams: 50 },
      { ingredient: "saladLeaves", grams: 50 },
      { ingredient: "tortilla", grams: 90 },
    ],
  },
  {
    id: "fr-chicken-plate",
    venueId: "falafel-rep",
    name: "Chicken shawarma plate",
    priceAud: 21,
    description: "Chicken shawarma, hummus, salad and a small rice.",
    portions: [
      { ingredient: "chickenBreast", grams: 180 },
      { ingredient: "hummus", grams: 60 },
      { ingredient: "saladLeaves", grams: 80 },
      { ingredient: "whiteRice", grams: 120 },
      { ingredient: "oliveOil", grams: 8 },
    ],
    tweaks: [
      {
        label: "Extra salad instead of rice",
        remove: ["whiteRice"],
        add: [{ ingredient: "saladLeaves", grams: 80 }],
      },
    ],
  },
];

export function venueById(id: string): Venue | undefined {
  return VENUES.find((v) => v.id === id);
}

export function dishById(id: string): Dish | undefined {
  return DISHES.find((d) => d.id === id);
}
