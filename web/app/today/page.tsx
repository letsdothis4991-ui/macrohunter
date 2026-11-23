"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import type { Targets } from "@/lib/matching";
import type { MacroKey } from "@/lib/nutrition";

import { MACRO_LABEL } from "~/components/badges";
import {
  dayKey,
  leftToday,
  MACRO_KEYS,
  shiftDay,
  totalsFor,
  type LogEntry,
} from "~/lib/daily";
import { downloadText, logToCsv, trackerText } from "~/lib/export";
import { useDaily, useHydrated, useLog, usePrefs } from "~/lib/store";

function dayLabel(day: string, today: string) {
  if (day === today) return "Today";
  if (day === shiftDay(today, -1)) return "Yesterday";
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function timeLabel(at: string) {
  const t = new Date(at);
  return Number.isNaN(t.getTime())
    ? ""
    : t.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" });
}

export default function TodayPage() {
  const hydrated = useHydrated();
  const router = useRouter();
  const today = dayKey();
  const [day, setDay] = useState(today);
  const { log, add, remove } = useLog();
  const [daily] = useDaily();
  const [, setPrefs] = usePrefs();

  const entries = useMemo(
    () =>
      log.filter((e) => e.day === day).sort((a, b) => a.at.localeCompare(b.at)),
    [log, day],
  );
  const eaten = useMemo(() => totalsFor(entries), [entries]);
  const left = leftToday(daily, eaten);
  const week = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => shiftDay(today, -i));
    return days.map((d) => ({
      day: d,
      totals: totalsFor(log.filter((e) => e.day === d)),
      count: log.filter((e) => e.day === d).length,
    }));
  }, [log, today]);
  const weekEntries = useMemo(() => {
    const from = shiftDay(today, -6);
    return log.filter((e) => e.day >= from && e.day <= today);
  }, [log, today]);

  if (!hydrated)
    return <div className="skeleton narrow" style={{ height: 320 }} />;

  const isToday = day === today;

  return (
    <div className="stack-lg narrow">
      <section className="stack-sm">
        <div className="eyebrow">Daily tracker</div>
        <div className="spread" style={{ alignItems: "center" }}>
          <h1>{dayLabel(day, today)}</h1>
          <div className="row" style={{ gap: 6 }}>
            <button
              className="btn small"
              aria-label="Previous day"
              onClick={() => setDay(shiftDay(day, -1))}
            >
              ←
            </button>
            <button
              className="btn small"
              aria-label="Next day"
              disabled={isToday}
              onClick={() => setDay(shiftDay(day, 1))}
            >
              →
            </button>
          </div>
        </div>
        <p className="muted small">
          {entries.length === 0
            ? isToday
              ? "Nothing logged yet. Tap “I ate this” on any dish or plate check."
              : "Nothing logged this day."
            : `${entries.length} item${entries.length === 1 ? "" : "s"} logged.`}{" "}
          <Link href="/targets#daily" className="link">
            Daily totals
          </Link>
        </p>
      </section>

      <DayGrid eaten={eaten} daily={daily} left={left} />

      {isToday && (
        <section className="hero stack-sm">
          <h2>
            {left.calories != null && left.calories <= 0
              ? "You've reached your calories for today"
              : "Find food for what's left"}
          </h2>
          <p className="small muted">{leftSentence(left)}</p>
          <div>
            <button
              className="btn primary"
              onClick={() => {
                setPrefs((o) => ({ ...o, fitTo: "left" }));
                router.push("/");
              }}
            >
              Show dishes that fit
            </button>
          </div>
        </section>
      )}

      <section className="stack">
        <h2>Logged</h2>
        {entries.length > 0 && (
          <div className="list">
            {entries.map((e) => (
              <Entry key={e.id} entry={e} onRemove={() => remove(e.id)} />
            ))}
          </div>
        )}
        <AddManual
          onAdd={(name, m) => {
            const now = new Date();
            const [y, mo, d] = day.split("-").map(Number);
            // Logging onto an earlier day: stamp it at the current time on that day.
            const at = isToday
              ? now
              : new Date(y, mo - 1, d, now.getHours(), now.getMinutes());
            add({
              day,
              at: at.toISOString(),
              name,
              source: "manual",
              macros: m,
            });
          }}
        />
      </section>

      <section className="stack">
        <div className="spread">
          <h2>Last 7 days</h2>
          <div className="row small" style={{ gap: 14 }}>
            <button
              className="link"
              disabled={entries.length === 0}
              onClick={() =>
                downloadText(`macrohunter-${day}.csv`, logToCsv(entries))
              }
            >
              Download day
            </button>
            <button
              className="link"
              disabled={weekEntries.length === 0}
              onClick={() =>
                downloadText(
                  `macrohunter-week-to-${today}.csv`,
                  logToCsv(weekEntries),
                )
              }
            >
              Download week
            </button>
          </div>
        </div>
        <div className="list">
          {week.map((w) => (
            <button
              key={w.day}
              className={`item week-row${w.day === day ? " on" : ""}`}
              onClick={() => setDay(w.day)}
            >
              <span className="item-title">{dayLabel(w.day, today)}</span>
              <span className="small muted num">
                {w.count === 0
                  ? "—"
                  : `${w.totals.calories} kcal · ${w.totals.protein}g protein`}
              </span>
            </button>
          ))}
        </div>
        <p className="tiny faint">
          CSV files open in Excel or Google Sheets. Trackers like MacroFactor
          don&apos;t accept imports from websites, so use &ldquo;Copy&rdquo; on
          a meal and paste it into their quick add.
        </p>
      </section>
    </div>
  );
}

function leftSentence(left: Record<MacroKey, number | null>) {
  const parts: string[] = [];
  if (left.calories != null)
    parts.push(
      left.calories >= 0
        ? `${left.calories} kcal left`
        : `${-left.calories} kcal over`,
    );
  if (left.protein != null)
    parts.push(
      left.protein > 0 ? `${left.protein}g protein to go` : "protein done",
    );
  if (left.carbs != null)
    parts.push(
      left.carbs >= 0
        ? `${left.carbs}g carbs left`
        : `${-left.carbs}g carbs over`,
    );
  if (left.fat != null)
    parts.push(
      left.fat >= 0 ? `${left.fat}g fat left` : `${-left.fat}g fat over`,
    );
  return parts.length
    ? `${parts.join(", ")}.`
    : "Set daily totals to see what's left.";
}

function DayGrid({
  eaten,
  daily,
  left,
}: {
  eaten: Record<MacroKey, number>;
  daily: Targets;
  left: Record<MacroKey, number | null>;
}) {
  return (
    <div className="macros">
      {MACRO_KEYS.map((k) => {
        const goal = daily[k];
        const l = left[k];
        const over = l != null && (k === "protein" ? false : l < 0);
        const pct = goal
          ? Math.min(100, Math.round((eaten[k] / goal) * 100))
          : null;
        const unit = k === "calories" ? "kcal" : "g";
        return (
          <div key={k} className={`macro ${k}${over ? " miss" : ""}`}>
            <div className="l">{MACRO_LABEL[k]}</div>
            <div className="v">
              {eaten[k]}
              <small>{unit}</small>
            </div>
            {pct != null && (
              <div className="bar" aria-hidden>
                <div style={{ width: `${pct}%` }} />
              </div>
            )}
            <div className="r">
              {goal == null ? (
                "no daily total"
              ) : l == null ? null : k === "protein" ? (
                l > 0 ? (
                  `${l} to go of ${goal}`
                ) : (
                  `done · goal ${goal}`
                )
              ) : l >= 0 ? (
                `${l} left of ${goal}`
              ) : (
                <b>{-l} over</b>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Entry({ entry, onRemove }: { entry: LogEntry; onRemove: () => void }) {
  const [copied, setCopied] = useState(false);
  const m = entry.macros;
  const venueHref = entry.placeId
    ? `/venue/${encodeURIComponent(entry.placeId)}${entry.dishId ? `#dish-${entry.dishId}` : ""}`
    : null;
  return (
    <div className="item">
      <div className="spread">
        <span className="item-title">
          {venueHref ? <Link href={venueHref}>{entry.name}</Link> : entry.name}
        </span>
        <span className="num">{m.calories} kcal</span>
      </div>
      <div className="spread small">
        <span className="muted">
          {[
            timeLabel(entry.at),
            entry.venueName,
            entry.source === "plate"
              ? "plate check"
              : entry.source === "manual"
                ? "added by hand"
                : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
        <span className="muted num">
          {m.protein}g P · {m.carbs}g C · {m.fat}g F
        </span>
      </div>
      <div className="row tiny" style={{ gap: 14, marginTop: 6 }}>
        <button
          className="link quiet"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(
                trackerText(entry.name, m, entry.venueName),
              );
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              window.prompt(
                "Copy this into your tracker:",
                trackerText(entry.name, m, entry.venueName),
              );
            }
          }}
        >
          {copied ? "Copied" : "Copy for tracker"}
        </button>
        <button className="link quiet" onClick={onRemove}>
          Remove
        </button>
      </div>
    </div>
  );
}

function AddManual({
  onAdd,
}: {
  onAdd: (name: string, m: Record<MacroKey, number>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [vals, setVals] = useState<Record<MacroKey, string>>({
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
  });
  const num = (s: string) => Math.max(0, Math.round(Number(s) || 0));
  const valid = name.trim() !== "" && vals.calories !== "";

  if (!open)
    return (
      <div>
        <button className="btn small" onClick={() => setOpen(true)}>
          + Add something else
        </button>
      </div>
    );

  return (
    <form
      className="list stack"
      style={{ padding: 18 }}
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        onAdd(name.trim(), {
          calories: num(vals.calories),
          protein: num(vals.protein),
          carbs: num(vals.carbs),
          fat: num(vals.fat),
        });
        setName("");
        setVals({ calories: "", protein: "", carbs: "", fat: "" });
        setOpen(false);
      }}
    >
      <input
        className="input"
        placeholder="What did you have? e.g. Protein shake"
        value={name}
        onChange={(e) => setName(e.target.value)}
        aria-label="Name"
        autoFocus
      />
      <div className="manual-grid">
        {MACRO_KEYS.map((k) => (
          <label key={k} className="small muted stack-sm">
            <span>
              {MACRO_LABEL[k]} ({k === "calories" ? "kcal" : "g"})
            </span>
            <input
              className="input"
              type="number"
              inputMode="numeric"
              min={0}
              value={vals[k]}
              onChange={(e) => setVals((v) => ({ ...v, [k]: e.target.value }))}
            />
          </label>
        ))}
      </div>
      <div className="row" style={{ gap: 14 }}>
        <button className="btn primary small" disabled={!valid} type="submit">
          Add
        </button>
        <button
          className="link quiet small"
          type="button"
          onClick={() => setOpen(false)}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
