import { router } from "expo-router";
import { useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

import { formatMacro } from "@/components/badges";
import { DishCard } from "@/components/dish-card";
import { AREA, IS_SAMPLE_DATA } from "@/data";
import { Radius, Spacing, usePalette } from "@/constants/theme";
import type { Targets } from "@/lib/matching";
import { useLocation } from "@/state/location";
import { useRankedDishes } from "@/state/results";
import { useTargets } from "@/state/targets";

function describeTargets(t: Targets): string {
  const parts: string[] = [];
  if (t.protein != null)
    parts.push(`${formatMacro("protein", t.protein)}+ protein`);
  if (t.calories != null)
    parts.push(`under ${formatMacro("calories", t.calories)}`);
  if (t.carbs != null) parts.push(`≤${t.carbs}g carbs`);
  if (t.fat != null) parts.push(`≤${t.fat}g fat`);
  return parts.length ? parts.join(" · ") : "No targets set";
}

export default function FindScreen() {
  const c = usePalette();
  const { targets } = useTargets();
  const location = useLocation();
  const dishes = useRankedDishes();
  const [onlyFits, setOnlyFits] = useState(true);

  const fitting = dishes.filter(
    (d) => d.match.status === "fits" || d.fixingTweak,
  );
  const shown = onlyFits ? fitting : dishes;

  return (
    <FlatList
      style={{ backgroundColor: c.background }}
      contentContainerStyle={styles.list}
      data={shown}
      keyExtractor={(d) => d.dish.id}
      renderItem={({ item }) => <DishCard item={item} />}
      ListHeaderComponent={
        <View style={styles.header}>
          <Pressable
            onPress={() => router.push("/targets")}
            style={[styles.targets, { backgroundColor: c.accentSoft }]}
          >
            <Text style={[styles.targetsLabel, { color: c.accent }]}>
              Per meal
            </Text>
            <Text style={[styles.targetsText, { color: c.text }]}>
              {describeTargets(targets)}
            </Text>
            <Text style={[styles.edit, { color: c.accent }]}>
              Edit targets ›
            </Text>
          </Pressable>

          <View style={styles.row}>
            <Text style={[styles.meta, { color: c.textSecondary }]}>
              {location.source === "device"
                ? "Near you"
                : `${AREA.name}${IS_SAMPLE_DATA ? " sample area" : ""}`}
            </Text>
            <Pressable onPress={location.locateMe} disabled={location.busy}>
              <Text style={[styles.link, { color: c.accent }]}>
                {location.busy ? "Locating…" : "Use my location"}
              </Text>
            </Pressable>
          </View>
          {location.outsideArea && (
            <Text style={[styles.note, { color: c.warning }]}>
              You are outside the area we cover, so distances are from{" "}
              {AREA.name} for now.
            </Text>
          )}
          {location.error && (
            <Text style={[styles.note, { color: c.danger }]}>
              {location.error}
            </Text>
          )}

          <View style={styles.row}>
            <Text style={[styles.count, { color: c.text }]}>
              {fitting.length} of {dishes.length} dishes fit
            </Text>
            <View style={styles.toggle}>
              <Text style={[styles.meta, { color: c.textSecondary }]}>
                Only fits
              </Text>
              <Switch value={onlyFits} onValueChange={setOnlyFits} />
            </View>
          </View>
        </View>
      }
      ListEmptyComponent={
        <Text style={[styles.empty, { color: c.textSecondary }]}>
          Nothing nearby fits these targets. Try loosening one, or turn off
          “Only fits” to see the closest options.
        </Text>
      }
      ListFooterComponent={
        <Text style={[styles.footer, { color: c.textSecondary }]}>
          {IS_SAMPLE_DATA
            ? "Sample venues and estimated numbers for testing. "
            : ""}
          Estimates are a guide, not dietary advice.
        </Text>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: Spacing.lg, gap: Spacing.md },
  header: { gap: Spacing.md, marginBottom: Spacing.xs },
  targets: { borderRadius: Radius.lg, padding: Spacing.lg, gap: Spacing.xs },
  targetsLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  targetsText: { fontSize: 18, fontWeight: "700" },
  edit: { fontSize: 14, fontWeight: "600", marginTop: Spacing.xs },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  toggle: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  meta: { fontSize: 14 },
  link: { fontSize: 14, fontWeight: "600" },
  note: { fontSize: 13 },
  count: { fontSize: 16, fontWeight: "700" },
  empty: { fontSize: 15, textAlign: "center", paddingVertical: Spacing.xl },
  footer: { fontSize: 12, textAlign: "center", paddingVertical: Spacing.lg },
});
