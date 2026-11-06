"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

import { evaluateDish, matchMacros } from "@/lib/matching";
import { ingredientName, type MacroKey } from "@/lib/nutrition";

import { FitBadge, MACRO_LABEL, MACRO_ORDER, unit } from "~/components/badges";
import { MacroGrid } from "~/components/macro-grid";
import { api, ApiFailure } from "~/lib/api";
import { prepareImage, type PreparedImage } from "~/lib/image";
import { useChecks, useHydrated, useMenus, useTargets } from "~/lib/store";
import type { PlateCheckResult } from "~/lib/types";
import { useStatus } from "~/lib/use-status";

export default function CheckPage() {
  return (
    <Suspense fallback={<div className="skeleton" style={{ height: 300 }} />}>
      <Check />
    </Suspense>
  );
}

function Check() {
  const params = useSearchParams();
  const hydrated = useHydrated();
  const status = useStatus();
  const [targets] = useTargets();
  const { menus } = useMenus();
  const { checks, add, remove } = useChecks();

  const venueId = params.get("venue");
  const dishId = params.get("dish");
  const menu = hydrated && venueId ? menus[venueId] : undefined;
  const dish = menu?.dishes.find((d) => d.id === dishId);
  const listed = menu && dish ? evaluateDish(dish, menu.confidence, targets) : null;

  const [photo, setPhoto] = useState<PreparedImage | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PlateCheckResult | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (result) resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [result]);

  async function choose(files: FileList | null) {
    const f = files?.[0];
    if (!f) return;
    setError(null);
    try {
      setPhoto(await prepareImage(f));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't use that photo.");
    }
  }

  async function submit() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const r = await api<{ result: PlateCheckResult }>("/api/check", {
        method: "POST",
        body: JSON.stringify({
          photo: photo ? { mediaType: photo.mediaType, base64: photo.base64 } : undefined,
          description: text.trim() || undefined,
          listed:
            menu && dish
              ? {
                  placeId: menu.placeId,
                  venueName: menu.venueName,
                  dishId: dish.id,
                  dishName: dish.name,
                  description: dish.description,
                  portions: dish.portions,
                }
              : undefined,
        }),
      });
      setResult(r.result);
      add(r.result);
    } catch (e) {
      setError(e instanceof ApiFailure ? e.message : "Couldn't check that meal.");
    } finally {
      setBusy(false);
    }
  }

  const canSubmit = !busy && (photo || text.trim().length >= 3);

  return (
    <div className="stack-lg narrow">
      <section className="stack-sm">
        <div className="eyebrow">Check my plate</div>
        <h1>What&apos;s actually on your plate?</h1>
        <p className="muted">Snap your meal or describe it. Portions are estimated from the photo; hidden oil and butter are allowed for.</p>
      </section>

      {status && !status.claude && <p className="notice">Plate checks need a Claude API key, which isn&apos;t set up yet.</p>}

      {listed && menu && (
        <p className="small muted">
          Comparing with <span style={{ color: "var(--text)", fontWeight: 600 }}>{listed.dish.name}</span> at {menu.venueName}, listed at{" "}
          {listed.range.mid.calories} kcal and {listed.range.mid.protein}g protein.{" "}
          <Link href="/check" className="link quiet">
            Clear
          </Link>
        </p>
      )}
      {venueId && dishId && hydrated && !listed && <p className="small muted">That dish isn&apos;t saved in this browser any more, so this is a standalone check.</p>}

      <section className="stack">
        {photo ? (
          <div className="stack-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.previewUrl} alt="Your meal" className="photo" />
            <p className="row small" style={{ gap: 16 }}>
              <button className="link quiet" onClick={() => file.current?.click()}>
                Retake
              </button>
              <button className="link quiet" onClick={() => setPhoto(null)}>
                Remove
              </button>
            </p>
          </div>
        ) : (
          <div
            className="drop"
            role="button"
            tabIndex={0}
            onClick={() => file.current?.click()}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && file.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              choose(e.dataTransfer.files);
            }}
          >
            <div style={{ fontWeight: 600 }}>Take a photo</div>
            <div className="small muted">From above, whole plate in view</div>
          </div>
        )}
        <input ref={file} type="file" accept="image/*" capture="environment" hidden onChange={(e) => choose(e.target.files)} />
        <textarea
          className="textarea"
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={listed ? "Anything the photo won't show? (optional)" : "Or describe it, e.g. chicken schnitzel burger with chips"}
        />
        {error && <p className="notice error">{error}</p>}
        <button className="btn primary block" onClick={submit} disabled={!canSubmit || status?.claude === false}>
          {busy ? (
            <>
              <span className="spinner" style={{ borderTopColor: "var(--bg)" }} /> Estimating…
            </>
          ) : (
            "Estimate"
          )}
        </button>
      </section>

      <div ref={resultRef}>{result && <CheckResult result={result} />}</div>

      {hydrated && checks.some((c) => c.id !== result?.id) && (
        <section className="stack">
          <h2>Recent</h2>
          <div className="list">
            {checks
              .filter((c) => c.id !== result?.id)
              .map((c) => (
                <details key={c.id} className="dish">
                  <summary>
                    <div className="dish-head">
                      <span className="dish-name">{c.dishName}</span>
                      <span className="dish-kcal">{c.range.mid.calories} kcal</span>
                      <span className="small muted">
                        {new Date(c.checkedAt).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                        {c.against && ` · ${c.against.venueName}`}
                      </span>
                      <span className="small muted num" style={{ textAlign: "right" }}>
                        {c.range.mid.protein}g protein
                      </span>
                    </div>
                  </summary>
                  <div className="dish-body stack">
                    <CheckResult result={c} compact />
                    <button className="link quiet small" onClick={() => remove(c.id)}>
                      Delete
                    </button>
                  </div>
                </details>
              ))}
          </div>
        </section>
      )}
    </div>
  );
}

const CONFIDENCE_TEXT = {
  high: "High confidence.",
  medium: "Medium confidence.",
  low: "Low confidence, treat as rough.",
};

function CheckResult({ result, compact }: { result: PlateCheckResult; compact?: boolean }) {
  const [targets] = useTargets();
  const match = matchMacros(result.range, targets);
  const fake = { dish: { id: result.id, venueId: "", name: result.dishName, description: "", priceAud: null, portions: result.portions }, range: result.range, match };

  return (
    <section className="stack">
      {!compact && (
        <div className="stack-sm">
          <div className="spread">
            <h2>{result.dishName}</h2>
            <FitBadge result={fake} />
          </div>
          <p className="muted small">{result.summary}</p>
        </div>
      )}
      <MacroGrid range={result.range} targets={targets} misses={match.misses} />
      {result.against && <Comparison result={result} />}
      {result.differences.length > 0 && <p className="small">Versus the menu: {result.differences.join("; ").replace(/\.$/, "")}.</p>}
      <p className="tiny faint">
        {CONFIDENCE_TEXT[result.confidence]}
        {result.unseen.length > 0 && ` Can't confirm: ${result.unseen.join("; ").toLowerCase()}.`} Assumes{" "}
        {result.portions.map((p) => `${ingredientName(p.ingredient)} ${p.grams}g`).join(", ")}.
      </p>
    </section>
  );
}

function Comparison({ result }: { result: PlateCheckResult }) {
  const a = result.against!;
  const diff = (k: MacroKey) => result.range.mid[k] - a.range.mid[k];
  return (
    <table className="simple">
      <thead>
        <tr>
          <th></th>
          <th>Menu</th>
          <th>Plate</th>
          <th>Diff</th>
        </tr>
      </thead>
      <tbody>
        {MACRO_ORDER.map((k) => {
          const d = diff(k);
          const big = Math.abs(d) > Math.max(a.range.mid[k] * 0.15, k === "calories" ? 60 : 4);
          return (
            <tr key={k}>
              <td>{MACRO_LABEL[k]}</td>
              <td>
                {a.range.mid[k]}
                {unit(k)}
              </td>
              <td>
                {result.range.mid[k]}
                {unit(k)}
              </td>
              <td style={{ color: big ? (d > 0 === (k === "protein") ? "var(--accent)" : "var(--red)") : "var(--muted)", fontWeight: big ? 600 : 400 }}>
                {d > 0 ? "+" : ""}
                {d}
                {unit(k)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
