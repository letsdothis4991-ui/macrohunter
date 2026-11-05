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

  if (!hydrated) return <div className="skeleton" style={{ height: 300 }} />;

  return (
    <div className="stack" style={{ maxWidth: 720 }}>
      <div>
        <h1>My targets</h1>
        <p className="muted">
          Set what one meal should hit. Protein is a minimum; calories, carbs and fat are maximums. Leave any of them off if you don&apos;t mind.
          Changes save straight away in this browser.
        </p>
      </div>

      <div className="card">
        <h2>Quick presets</h2>
        <div className="row">
          {PRESETS.map((p) => {
            const on = JSON.stringify(p.targets) === JSON.stringify(targets);
            return (
              <button key={p.name} className={`chip${on ? " on" : ""}`} onClick={() => update(p.targets)} title={describeTargets(p.targets)}>
                {p.name}
              </button>
            );
          })}
          <button className="chip" onClick={() => update(DEFAULT_TARGETS)} title={describeTargets(DEFAULT_TARGETS)}>
            Default
          </button>
        </div>
      </div>

      <div className="card">
        <div className="spread">
          <h2 style={{ margin: 0 }}>Per meal</h2>
          {saved && <span className="badge fit">Saved</span>}
        </div>
        {ROWS.map((r) => {
          const value = targets[r.key];
          const on = value != null;
          return (
            <div className="target-row" key={r.key}>
              <label className="row" style={{ fontWeight: 650 }}>
                <input
                  type="checkbox"
                  checked={on}
                  onChange={(e) => update({ ...targets, [r.key]: e.target.checked ? (DEFAULT_TARGETS[r.key] ?? (r.key === "carbs" ? 60 : 30)) : null })}
                />
                {r.label}
              </label>
              <span className="hint small muted">{on ? `${r.kind === "min" ? "At least" : "No more than"} ${value} ${r.unit}` : "Not tracked"}</span>
              <div className="row target-input" style={{ flexWrap: "nowrap" }}>
                <NumberInput
                  disabled={!on}
                  label={`${r.label} target in ${r.unit}`}
                  value={value}
                  max={r.max}
                  step={r.step}
                  onCommit={(n) => update({ ...targets, [r.key]: n })}
                />
                <span className="small muted">{r.unit}</span>
              </div>
            </div>
          );
        })}
        <p className="small muted" style={{ marginTop: 12 }}>
          A dish shows <strong>Likely fits</strong> when the middle of its range meets every target, and <strong>Fits</strong> when even the
          unfavourable end of the range does (least protein, most calories).
        </p>
      </div>

      <div className="row">
        <Link href="/" className="btn primary">
          Find food that fits
        </Link>
      </div>

      <div className="card small">
        <h2>Your data</h2>
        <p className="muted">
          Targets, menus you&apos;ve read and plate checks are saved only in this browser. Nothing is tied to an account.
        </p>
        <button
          className="btn small"
          onClick={() => {
            if (confirm("Clear your targets, saved menus and plate checks from this browser?")) {
              clearEverything();
            }
          }}
        >
          Clear everything saved in this browser
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
