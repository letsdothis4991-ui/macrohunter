import { router } from "expo-router";
import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

import { formatMacro, MACRO_LABEL } from "@/components/badges";
import { Radius, Spacing, usePalette } from "@/constants/theme";
import { PRESETS, type Targets } from "@/lib/matching";
import type { MacroKey } from "@/lib/nutrition";
import { useTargets } from "@/state/targets";

const FIELDS: {
  key: MacroKey;
  kind: "at least" | "at most";
  step: number;
  fallback: number;
}[] = [
  { key: "protein", kind: "at least", step: 5, fallback: 30 },
  { key: "calories", kind: "at most", step: 50, fallback: 600 },
  { key: "carbs", kind: "at most", step: 5, fallback: 50 },
  { key: "fat", kind: "at most", step: 5, fallback: 20 },
];

export default function TargetsScreen() {
  const c = usePalette();
  const { targets, setTargets } = useTargets();
  const [draft, setDraft] = useState<Targets>(targets);

  const update = (key: MacroKey, value: number | null) =>
    setDraft((d) => ({ ...d, [key]: value }));

  return (
    <ScrollView
      style={{ backgroundColor: c.background }}
      contentContainerStyle={styles.container}
    >
      <Text style={[styles.section, { color: c.textSecondary }]}>
        Quick presets
      </Text>
      <View style={styles.presets}>
        {PRESETS.map((p) => (
          <Pressable
            key={p.name}
            onPress={() => setDraft(p.targets)}
            style={[
              styles.preset,
              { borderColor: c.border, backgroundColor: c.card },
            ]}
          >
            <Text style={[styles.presetText, { color: c.text }]}>{p.name}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.section, { color: c.textSecondary }]}>
        For one meal
      </Text>
      {FIELDS.map(({ key, kind, step, fallback }) => {
        const value = draft[key];
        const on = value != null;
        return (
          <View key={key} style={[styles.field, { backgroundColor: c.card }]}>
            <View style={styles.fieldHeader}>
              <Text style={[styles.fieldName, { color: c.text }]}>
                {MACRO_LABEL[key]}{" "}
                <Text style={{ color: c.textSecondary }}>{kind}</Text>
              </Text>
              <Switch
                value={on}
                onValueChange={(v) => update(key, v ? fallback : null)}
              />
            </View>
            {on && (
              <View style={styles.stepper}>
                <Pressable
                  accessibilityLabel={`Decrease ${MACRO_LABEL[key]}`}
                  onPress={() => update(key, Math.max(step, value - step))}
                  style={[styles.stepButton, { borderColor: c.border }]}
                >
                  <Text style={[styles.stepText, { color: c.text }]}>−</Text>
                </Pressable>
                <Text style={[styles.value, { color: c.text }]}>
                  {formatMacro(key, value)}
                </Text>
                <Pressable
                  accessibilityLabel={`Increase ${MACRO_LABEL[key]}`}
                  onPress={() => update(key, value + step)}
                  style={[styles.stepButton, { borderColor: c.border }]}
                >
                  <Text style={[styles.stepText, { color: c.text }]}>+</Text>
                </Pressable>
              </View>
            )}
          </View>
        );
      })}

      <Pressable
        onPress={() => {
          setTargets(draft);
          router.back();
        }}
        style={[styles.save, { backgroundColor: c.accent }]}
      >
        <Text style={styles.saveText}>Show matching food</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.lg, gap: Spacing.md },
  section: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: Spacing.sm,
  },
  presets: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  preset: {
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  presetText: { fontSize: 14, fontWeight: "600" },
  field: { borderRadius: Radius.lg, padding: Spacing.lg, gap: Spacing.md },
  fieldHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  fieldName: { fontSize: 16, fontWeight: "700" },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stepButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  stepText: { fontSize: 22, fontWeight: "600" },
  value: { fontSize: 24, fontWeight: "700", fontVariant: ["tabular-nums"] },
  save: {
    borderRadius: Radius.lg,
    paddingVertical: Spacing.lg,
    alignItems: "center",
    marginTop: Spacing.md,
  },
  saveText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
});
