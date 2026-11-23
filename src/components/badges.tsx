import { StyleSheet, Text, View } from "react-native";

import { Radius, Spacing, usePalette } from "@/constants/theme";
import type { DishResult } from "@/lib/matching";
import {
  CONFIDENCE_INFO,
  type Confidence,
  MACRO_KEYS,
  type MacroKey,
  type Macros,
} from "@/lib/nutrition";

export const MACRO_LABEL: Record<MacroKey, string> = {
  protein: "Protein",
  calories: "Calories",
  carbs: "Carbs",
  fat: "Fat",
};

export function formatMacro(key: MacroKey, value: number): string {
  return key === "calories" ? `${value} kcal` : `${value}g`;
}

function Chip({
  text,
  color,
  background,
  border = background,
}: {
  text: string;
  color: string;
  background: string;
  border?: string;
}) {
  return (
    <View
      style={[
        styles.chip,
        { backgroundColor: background, borderColor: border },
      ]}
    >
      <Text style={[styles.chipText, { color }]}>{text}</Text>
    </View>
  );
}

export function FitBadge({ result }: { result: DishResult }) {
  const c = usePalette();
  const { match, fixingTweak } = result;
  if (match.status === "fits") {
    return (
      <Chip
        text={match.fitsWorstCase ? "Fits" : "Likely fits"}
        color={c.accent}
        background={c.accentSoft}
      />
    );
  }
  if (fixingTweak)
    return (
      <Chip
        text="Fits with a tweak"
        color={c.accent}
        background={c.accentSoft}
      />
    );
  if (match.status === "close")
    return <Chip text="Close" color={c.warning} background={c.warningSoft} />;
  return <Chip text="Doesn't fit" color={c.danger} background={c.dangerSoft} />;
}

export function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  const c = usePalette();
  const label = CONFIDENCE_INFO[confidence].label;
  return confidence === "estimated" ? (
    <Chip
      text={label}
      color={c.textSecondary}
      background={c.background}
      border={c.border}
    />
  ) : (
    <Chip text={`✓ ${label}`} color={c.accent} background={c.accentSoft} />
  );
}

/** Compact one-line macro summary; values that miss a target are highlighted. */
export function MacroLine({
  macros,
  misses = [],
}: {
  macros: Macros;
  misses?: MacroKey[];
}) {
  const c = usePalette();
  return (
    <View style={styles.macroLine}>
      {MACRO_KEYS.map((k) => (
        <View key={k} style={styles.macroCell}>
          <Text
            style={[
              styles.macroValue,
              { color: misses.includes(k) ? c.danger : c.text },
            ]}
          >
            {k === "calories" ? macros.calories : `${macros[k]}g`}
          </Text>
          <Text style={[styles.macroLabel, { color: c.textSecondary }]}>
            {k === "calories" ? "kcal" : MACRO_LABEL[k].toLowerCase()}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderWidth: 1,
    borderRadius: Radius.pill,
    alignSelf: "flex-start",
  },
  chipText: { fontSize: 12, fontWeight: "600" },
  macroLine: { flexDirection: "row", gap: Spacing.lg },
  macroCell: { alignItems: "flex-start" },
  macroValue: {
    fontSize: 16,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  macroLabel: { fontSize: 11 },
});
