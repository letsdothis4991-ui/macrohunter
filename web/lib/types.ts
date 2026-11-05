import type { Dish } from "@/lib/matching";
import type { Confidence, IngredientId, MacroRange, Portion } from "@/lib/nutrition";

export type VenueKind = "Café" | "Restaurant" | "Takeaway" | "Juice bar" | "Bakery";

/** A food place, as the website shows it. Ratings come live from Google, never stored. */
export type Venue = {
  placeId: string;
  name: string;
  kind: VenueKind;
  cuisine: string | null;
  address: string;
  lat: number;
  lng: number;
  rating: number | null;
  ratingCount: number | null;
  /** "$" to "$$$$", or null when Google doesn't say. */
  price: string | null;
  openNow: boolean | null;
  mapsUrl: string | null;
  website: string | null;
  /** True for the fictional venues shown when no Google key is set up. */
  demo?: boolean;
};

export type MenuSource =
  | { kind: "website"; url: string }
  | { kind: "pasted" }
  | { kind: "photos"; count: number }
  | { kind: "link"; url: string }
  | { kind: "demo" };

/** A venue's menu after Claude has read it. Dishes reuse the shared Dish shape. */
export type VenueMenu = {
  placeId: string;
  venueName: string;
  source: MenuSource;
  readAt: string;
  cuisine: string | null;
  confidence: Confidence;
  dishes: Dish[];
  /** Dishes left out, and why (too vague, implausible portions). */
  skipped: { name: string; reason: string }[];
};

export type PlateConfidence = "low" | "medium" | "high";

export type PlateCheckResult = {
  id: string;
  checkedAt: string;
  dishName: string;
  summary: string;
  confidence: PlateConfidence;
  portions: Portion[];
  range: MacroRange;
  /** What a photo or description can't confirm (oil, butter, sauces mixed in). */
  unseen: string[];
  /** Differences from the listed dish, when one was given. */
  differences: string[];
  usedPhoto: boolean;
  /** The listed dish this was checked against, if any. */
  against?: { placeId: string; venueName: string; dishId: string; dishName: string; range: MacroRange };
};

export type ApiError = { error: string; code?: string };

export type Status = { google: boolean; claude: boolean; passwordProtected: boolean };

export type { Dish, IngredientId };
