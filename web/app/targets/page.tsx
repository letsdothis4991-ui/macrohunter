"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

import { DEFAULT_TARGETS, PRESETS, type Targets } from "@/lib/matching";

import { describeTargets } from "~/components/targets-summary";
import { clearEverything, useHydrated, useOnboarded, useTargets } from "~/lib/store";

const ROWS: { key: keyof Targets; label: string; unit: string; kind: "min" | "max"; hint: string; step: number; max: number }[] = [
  { key: "protein", label: "Protein", unit: "g", kind: "min", hint: "At least this much", step: 5, max: 150 },
  { key: "calories", label: "Calories", unit: "kcal", kind: "max", hint: "No more than this", step: 50, max: 2500 },
  { key: "carbs", label: "Carbs", unit: "g", kind: "max", hint: "No more than this", step: 5, max: 300 },
  { key: "fat", label: "Fat", unit: "g", kind: "max", hint: "No more than this", step: 5, max: 150 },
];

export default function TargetsPage() {
  const hydrated = useHydrated();
  const [targets, setTargets] = useTargets();
  const [, setOnboarded] = useOnboarded();
  const [saved, setSaved] = useState(false);

  function update(next: Targets) {
    setTargets(next);
    setOnboarded(true);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  if (!hydrated) return <div className="skeleton narrow" style={{ height: 300 }} />;

  return (
    <div className="stack-lg narrow">
      <section className="stack-sm">
        <div className="eyebrow">Targets</div>
        <h1>What should one meal hit?</h1>
        <p className="muted">Protein is a minimum, the rest are maximums. Saved in this browser.</p>
      </section>

      <section className="stack">
        <div className="seg" style={{ flexWrap: "wrap" }}>
          {[...PRESETS, { name: "Default", targets: DEFAULT_TARGETS }].map((p) => (
            <button key={p.name} className={JSON.stringify(p.targets) === JSON.stringify(targets) ? "on" : undefined} onClick={() => update(p.targets)}>
              {p.name}
            </button>
          ))}
        </div>

        <div className="list">
          {ROWS.map((r) => {
            const value = targets[r.key];
            const on = value != null;
            return (
              <div className="target-row" key={r.key}>
                <div>
                  <div style={{ fontWeight: 600 }}>{r.label}</div>
                  <button
                    className="link quiet small"
                    onClick={() => update({ ...targets, [r.key]: on ? null : (DEFAULT_TARGETS[r.key] ?? (r.key === "carbs" ? 60 : 30)) })}
                  >
                    {on ? (r.kind === "min" ? "Minimum · turn off" : "Maximum · turn off") : "Not tracked · turn on"}
                  </button>
                </div>
                {on ? (
                  <div className="target-input">
                    <NumberInput label={`${r.label} target in ${r.unit}`} value={value} max={r.max} step={r.step} disabled={false} onCommit={(n) => update({ ...targets, [r.key]: n })} />
                    <span className="small muted" style={{ width: 28 }}>
                      {r.unit}
                    </span>
                  </div>
                ) : (
                  <span className="faint">—</span>
                )}
              </div>
            );
          })}
        </div>
        <p className="small muted" style={{ minHeight: "1.5em" }}>
          {saved ? <span style={{ color: "var(--accent)" }}>Saved.</span> : "\u00a0"}
        </p>
      </section>

      <p className="small muted">
        <b style={{ color: "var(--text)", fontWeight: 600 }}>Likely fits</b> means the middle of a dish&apos;s range meets every target.{" "}
        <b style={{ color: "var(--text)", fontWeight: 600 }}>Fits</b> means even the unfavourable end does.
      </p>

      <div className="row" style={{ gap: 20 }}>
        <Link href="/" className="btn primary">
          Find food
        </Link>
        <button
          className="link quiet small"
          onClick={() => {
            if (confirm("Clear your targets, saved menus and plate checks from this browser?")) clearEverything();
          }}
        >
          Clear saved data
        </button>
      </div>
    </div>
  );
}

/** Lets you clear the box and retype without the target switching itself off. */
function NumberInput({
  value,
  disabled,
  label,
  max,
  step,
  onCommit,
}: {
  value: number | null;
  disabled: boolean;
  label: string;
  max: number;
  step: number;
  onCommit: (n: number) => void;
}) {
  const [draft, setDraft] = useState(value == null ? "" : String(value));
  useEffect(() => setDraft(value == null ? "" : String(value)), [value]);
  return (
    <input
      className="input"
      type="number"
      inputMode="numeric"
      min={0}
      max={max}
      step={step}
      disabled={disabled}
      aria-label={label}
      value={draft}
      onChange={(e) => {
        setDraft(e.target.value);
        const n = Number(e.target.value);
        if (e.target.value !== "" && Number.isFinite(n)) onCommit(Math.max(0, Math.min(max, Math.round(n))));
      }}
      onBlur={() => setDraft(value == null ? "" : String(value))}
    />
  );
}
