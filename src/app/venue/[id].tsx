import { Stack, useLocalSearchParams } from "expo-router";
import { FlatList, StyleSheet, Text, View } from "react-native";

import { ConfidenceBadge } from "@/components/badges";
import { DishCard } from "@/components/dish-card";
import { Spacing, usePalette } from "@/constants/theme";
import { venueById } from "@/data";
import { formatDistance } from "@/lib/geo";
import { useRankedDishes } from "@/state/results";

export default function VenueScreen() {
  const c = usePalette();
  const { id } = useLocalSearchParams<{ id: string }>();
  const venue = venueById(id);
  const dishes = useRankedDishes().filter((d) => d.dish.venueId === id);

  if (!venue) {
    return (
      <Text style={[styles.missing, { color: c.textSecondary }]}>
        Venue not found.
      </Text>
    );
  }

  return (
    <FlatList
      style={{ backgroundColor: c.background }}
      contentContainerStyle={styles.list}
      data={dishes}
      keyExtractor={(d) => d.dish.id}
      renderItem={({ item }) => <DishCard item={item} showVenue={false} />}
      ListHeaderComponent={
        <View style={styles.header}>
          <Stack.Screen options={{ title: venue.name }} />
          <Text style={[styles.title, { color: c.text }]}>{venue.name}</Text>
          <Text style={[styles.meta, { color: c.textSecondary }]}>
            {venue.kind} · {venue.cuisine} · {venue.address}
            {dishes[0] ? ` · ${formatDistance(dishes[0].distanceKm)}` : ""}
          </Text>
          <ConfidenceBadge confidence={venue.confidence} />
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: Spacing.lg, gap: Spacing.md },
  missing: { padding: Spacing.xl, textAlign: "center" },
  header: { gap: Spacing.sm, marginBottom: Spacing.sm },
  title: { fontSize: 26, fontWeight: "800" },
  meta: { fontSize: 14 },
});
