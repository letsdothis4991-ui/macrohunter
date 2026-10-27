import { useMemo } from "react";

import { DISHES, type Venue, venueById } from "@/data/venues";
import { distanceKm } from "@/lib/geo";
import { type DishResult, evaluateDish, rankResults } from "@/lib/matching";

import { useLocation } from "./location";
import { useTargets } from "./targets";

export type RankedDish = DishResult & { venue: Venue; distanceKm: number };

export function useRankedDishes(): RankedDish[] {
  const { targets } = useTargets();
  const { position } = useLocation();
  return useMemo(() => {
    const results: RankedDish[] = [];
    for (const dish of DISHES) {
      const venue = venueById(dish.venueId);
      if (!venue) continue;
      results.push({
        ...evaluateDish(dish, venue.confidence, targets),
        venue,
        distanceKm: distanceKm(position, venue),
      });
    }
    return rankResults(results);
  }, [targets, position]);
}
