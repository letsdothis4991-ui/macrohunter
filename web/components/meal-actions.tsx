"use client";
import Link from "next/link";
import { useState } from "react";

import type { MacroRange } from "@/lib/nutrition";

import { dayKey, type LogEntry } from "~/lib/daily";
import { trackerText } from "~/lib/export";
import { dishKey, roundMacros, useLog, useSavedDishes } from "~/lib/store";

export type MealInfo = {
  name: string;
  range: MacroRange;
  source: LogEntry["source"];
  venueName?: string;
  placeId?: string;
  dishId?: string;
  description?: string;
};

/** "I ate this", save, and send to another tracker. Used on dishes, plate checks and saved dishes. */
export function MealActions({
  meal,
  children,
}: {
  meal: MealInfo;
  children?: React.ReactNode;
}) {
  const { add, remove } = useLog();
  const { isSaved, toggle } = useSavedDishes();
  const [added, setAdded] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const canSave = Boolean(meal.placeId && meal.dishId);
  const key = canSave ? dishKey(meal.placeId!, meal.dishId!) : "";
  const saved = canSave && isSaved(key);
  const macros = roundMacros(meal.range.mid);
  const text = trackerText(meal.name, macros, meal.venueName);
  const canShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this into your tracker:", text);
    }
  }

  return (
    <div className="stack-sm">
      <div className="row" style={{ gap: 10, rowGap: 10 }}>
        {added ? (
          <span className="small" role="status">
            <span style={{ color: "var(--accent-strong)", fontWeight: 650 }}>
              Added to today.
            </span>{" "}
            <Link href="/today" className="link">
              View
            </Link>
            <span className="faint"> or </span>
            <button
              className="link quiet"
              onClick={() => {
                remove(added);
                setAdded(null);
              }}
            >
              Undo
            </button>
          </span>
        ) : (
          <button
            className="btn small primary"
            onClick={() =>
              setAdded(
                add({
                  day: dayKey(),
                  name: meal.name,
                  venueName: meal.venueName,
                  placeId: meal.placeId,
                  dishId: meal.dishId,
                  source: meal.source,
                  macros,
                  range: meal.range,
                }).id,
              )
            }
          >
            I ate this
          </button>
        )}
        {canSave && (
          <button
            className={`btn small${saved ? " saved" : ""}`}
            aria-pressed={saved}
            onClick={() =>
              toggle({
                key,
                placeId: meal.placeId!,
                dishId: meal.dishId!,
                name: meal.name,
                venueName: meal.venueName ?? "",
                description: meal.description ?? "",
                range: meal.range,
              })
            }
          >
            {saved ? "★ Saved" : "☆ Save"}
          </button>
        )}
        {children}
      </div>
      <div className="row tiny" style={{ gap: 14 }}>
        <span className="faint">Send to your tracker:</span>
        <button className="link quiet" onClick={copy}>
          {copied ? "Copied" : "Copy"}
        </button>
        {canShare && (
          <button
            className="link quiet"
            onClick={() =>
              navigator.share({ title: meal.name, text }).catch(() => {})
            }
          >
            Share
          </button>
        )}
      </div>
    </div>
  );
}
