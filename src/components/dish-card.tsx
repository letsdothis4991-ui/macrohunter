import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Radius, Spacing, usePalette } from "@/constants/theme";
import { formatDistance } from "@/lib/geo";
import type { RankedDish } from "@/state/results";

import { ConfidenceBadge, FitBadge, MacroLine } from "./badges";

export function DishCard({
  item,
  showVenue = true,
}: {
  item: RankedDish;
  showVenue?: boolean;
}) {
  const c = usePalette();
  const { dish, venue, range, match, fixingTweak } = item;
  return (
    <Pressable
      onPress={() =>
        router.push({ pathname: "/dish/[id]", params: { id: dish.id } })
      }
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: c.card, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.titleBlock}>
          <Text style={[styles.name, { color: c.text }]}>{dish.name}</Text>
          {showVenue && (
            <Text style={[styles.venue, { color: c.textSecondary }]}>
              {venue.name} · {formatDistance(item.distanceKm)} · $
              {dish.priceAud}
            </Text>
          )}
        </View>
        <FitBadge result={item} />
      </View>
      <MacroLine macros={range.mid} misses={match.misses} />
      {fixingTweak && (
        <Text style={[styles.tweak, { color: c.accent }]}>
          Fits if you ask: {fixingTweak.tweak.label.toLowerCase()}
        </Text>
      )}
      <ConfidenceBadge confidence={dish.confidence ?? venue.confidence} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.lg, padding: Spacing.lg, gap: Spacing.md },
  header: { flexDirection: "row", gap: Spacing.sm, alignItems: "flex-start" },
  titleBlock: { flex: 1, gap: 2 },
  name: { fontSize: 17, fontWeight: "700" },
  venue: { fontSize: 13 },
  tweak: { fontSize: 13, fontWeight: "600" },
});
