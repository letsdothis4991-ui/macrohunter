import { router, Stack, useLocalSearchParams } from "expo-router";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  ConfidenceBadge,
  FitBadge,
  formatMacro,
  MACRO_LABEL,
} from "@/components/badges";
import { Radius, Spacing, usePalette } from "@/constants/theme";
import { formatDistance } from "@/lib/geo";
import { applyTweak, matchMacros } from "@/lib/matching";
import {
  CONFIDENCE_INFO,
  ingredientName,
  MACRO_KEYS,
  macrosFor,
  rangeFor,
} from "@/lib/nutrition";
import { useRankedDishes } from "@/state/results";
import { useTargets } from "@/state/targets";

export default function DishScreen() {
  const c = usePalette();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { targets } = useTargets();
  const item = useRankedDishes().find((d) => d.dish.id === id);

  if (!item) {
    return (
      <Text style={[styles.missing, { color: c.textSecondary }]}>
        Dish not found.
      </Text>
    );
  }

  const { dish, venue, range, match } = item;
  const confidence = dish.confidence ?? venue.confidence;

  return (
    <ScrollView
      style={{ backgroundColor: c.background }}
      contentContainerStyle={styles.container}
    >
      <Stack.Screen options={{ title: dish.name }} />

      <View style={styles.titleBlock}>
        <Text style={[styles.title, { color: c.text }]}>{dish.name}</Text>
        <Pressable
          onPress={() =>
            router.push({ pathname: "/venue/[id]", params: { id: venue.id } })
          }
        >
          <Text style={[styles.venue, { color: c.accent }]}>
            {venue.name} · {formatDistance(item.distanceKm)} · ${dish.priceAud}
          </Text>
        </Pressable>
        <Text style={[styles.description, { color: c.textSecondary }]}>
          {dish.description}
        </Text>
        <View style={styles.badges}>
          <FitBadge result={item} />
          <ConfidenceBadge confidence={confidence} />
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: c.card }]}>
        {MACRO_KEYS.map((k) => {
          const target = targets[k];
          const missed = match.misses.includes(k);
          const spread =
            range.low[k] === range.high[k]
              ? ""
              : `${range.low[k]}–${range.high[k]}`;
          return (
            <View key={k} style={styles.macroRow}>
              <Text style={[styles.macroName, { color: c.text }]}>
                {MACRO_LABEL[k]}
              </Text>
              <View style={styles.macroValues}>
                <Text
                  style={[
                    styles.macroMid,
                    { color: missed ? c.danger : c.text },
                  ]}
                >
                  {formatMacro(k, range.mid[k])}
                </Text>
                {spread !== "" && (
                  <Text style={[styles.macroRange, { color: c.textSecondary }]}>
                    range {spread}
                  </Text>
                )}
                {target != null && (
                  <Text style={[styles.macroRange, { color: c.textSecondary }]}>
                    target {k === "protein" ? "≥" : "≤"}{" "}
                    {formatMacro(k, target)}
                  </Text>
                )}
              </View>
            </View>
          );
        })}
        <Text style={[styles.blurb, { color: c.textSecondary }]}>
          {CONFIDENCE_INFO[confidence].blurb}
        </Text>
      </View>

      {!!dish.tweaks?.length && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>
            Ask for a change
          </Text>
          {dish.tweaks.map((tweak) => {
            const tweaked = rangeFor(
              macrosFor(applyTweak(dish.portions, tweak)),
              confidence,
            );
            const tMatch = matchMacros(tweaked, targets);
            const deltas = MACRO_KEYS.map((k) => ({
              k,
              d: tweaked.mid[k] - range.mid[k],
            })).filter((x) => x.d !== 0);
            return (
              <View
                key={tweak.label}
                style={[styles.card, { backgroundColor: c.card }]}
              >
                <View style={styles.tweakHeader}>
                  <Text style={[styles.tweakLabel, { color: c.text }]}>
                    {tweak.label}
                  </Text>
                  <FitBadge result={{ dish, range: tweaked, match: tMatch }} />
                </View>
                <Text style={[styles.description, { color: c.textSecondary }]}>
                  {deltas
                    .map(({ k, d }) =>
                      `${d > 0 ? "+" : "−"}${formatMacro(k, Math.abs(d))} ${k === "calories" ? "" : k}`.trim(),
                    )
                    .join(" · ")}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: c.text }]}>
          How we worked this out
        </Text>
        <Text style={[styles.description, { color: c.textSecondary }]}>
          {dish.portions
            .map((p) => `${ingredientName(p.ingredient)} ${p.grams}g`)
            .join(", ")}
        </Text>
      </View>

      <Pressable
        style={[styles.report, { borderColor: c.border }]}
        onPress={() =>
          Alert.alert(
            "Thanks",
            "Reporting wrong numbers is coming in the next version.",
          )
        }
      >
        <Text style={[styles.reportText, { color: c.text }]}>
          Numbers look wrong? Report it
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.lg, gap: Spacing.lg },
  missing: { padding: Spacing.xl, textAlign: "center" },
  titleBlock: { gap: Spacing.sm },
  title: { fontSize: 26, fontWeight: "800" },
  venue: { fontSize: 15, fontWeight: "600" },
  description: { fontSize: 14, lineHeight: 20 },
  badges: { flexDirection: "row", gap: Spacing.sm, flexWrap: "wrap" },
  card: { borderRadius: Radius.lg, padding: Spacing.lg, gap: Spacing.md },
  macroRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  macroName: { fontSize: 16, fontWeight: "600" },
  macroValues: { alignItems: "flex-end" },
  macroMid: { fontSize: 18, fontWeight: "700", fontVariant: ["tabular-nums"] },
  macroRange: { fontSize: 12 },
  blurb: { fontSize: 12, lineHeight: 17 },
  section: { gap: Spacing.sm },
  sectionTitle: { fontSize: 18, fontWeight: "700" },
  tweakHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: Spacing.sm,
  },
  tweakLabel: { fontSize: 15, fontWeight: "600", flex: 1 },
  report: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: "center",
  },
  reportText: { fontSize: 15, fontWeight: "600" },
});
