"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

import { evaluateDish, matchMacros } from "@/lib/matching";
import { ingredientName, type MacroKey } from "@/lib/nutrition";

import { FitBadge, MACRO_LABEL, MACRO_ORDER, unit } from "~/components/badges";
import { MacroGrid, MacroLine } from "~/components/macro-grid";
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
    <div className="stack" style={{ maxWidth: 820 }}>
      <div>
        <h1>Check my plate</h1>
        <p className="muted">
          Snap your meal or describe it, and get an estimate of what&apos;s actually on the plate. It narrows down portion sizes. It can&apos;t see oil,
          butter or sauce mixed in, so it&apos;s a check, not a lab test.
        </p>
      </div>

      {status && !status.claude && <div className="notice warn">Plate checks need a Claude API key, which isn&apos;t set up yet.</div>}

      {listed && menu && (
        <div className="card">
          <div className="small muted">Checking against</div>
          <div className="spread">
            <div>
              <strong>{listed.dish.name}</strong> <span className="muted">at {menu.venueName}</span>
            </div>
            <FitBadge result={listed} />
          </div>
          <div style={{ marginTop: 4 }}>
            <MacroLine range={listed.range} /> <span className="tiny muted">(menu estimate)</span>
          </div>
          <div className="tiny muted" style={{ marginTop: 6 }}>
            <Link href="/check">Check something else instead</Link>
          </div>
        </div>
      )}
      {venueId && dishId && hydrated && !listed && (
        <div className="notice info small">That dish isn&apos;t saved in this browser any more, so this will be a standalone check.</div>
      )}

      <div className="card stack">
        <div className="grid-2">
          <div className="stack">
            <h2 style={{ margin: 0 }}>1. Photo</h2>
            {photo ? (
              <div className="stack">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.previewUrl} alt="Your meal" className="preview-photo" />
                <div className="row">
                  <button className="btn small" onClick={() => file.current?.click()}>
                    Retake
                  </button>
                  <button className="btn small ghost" onClick={() => setPhoto(null)}>
                    Remove
                  </button>
                </div>
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
                <div style={{ fontSize: "2rem" }}>📷</div>
                <strong>Take a photo of your meal</strong>
                <div className="small muted">From above, with the whole plate and a fork or hand in shot for scale.</div>
              </div>
            )}
            <input ref={file} type="file" accept="image/*" capture="environment" hidden onChange={(e) => choose(e.target.files)} />
          </div>
          <div className="stack">
            <h2 style={{ margin: 0 }}>2. Description {photo || listed ? <span className="muted small">(optional)</span> : null}</h2>
            <textarea
              className="textarea"
              rows={6}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={
                listed
                  ? "Anything the photo won't show? e.g. 'asked for extra chicken', 'dressing on the side', 'cooked in butter'"
                  : "Type the menu description or what you're eating, e.g. 'Chicken schnitzel burger with chips and aioli from the pub'"
              }
            />
            <p className="tiny muted" style={{ margin: 0 }}>
              No photo? A description on its own works too, using typical portion sizes.
            </p>
          </div>
        </div>
        {error && <div className="notice bad">{error}</div>}
        <button className="btn primary block" onClick={submit} disabled={!canSubmit || status?.claude === false}>
          {busy ? (
            <>
              <span className="spinner" /> Checking… usually 10 to 30 seconds
            </>
          ) : (
            "Estimate my meal"
          )}
        </button>
      </div>

      <div ref={resultRef}>{result && <CheckResult result={result} />}</div>

      {hydrated && checks.some((c) => c.id !== result?.id) && (
        <section>
          <h2 className="section-title">Your recent checks</h2>
          {checks
            .filter((c) => c.id !== result?.id)
            .map((c) => (
              <details key={c.id} className="card dish">
                <summary>
                  <div className="spread">
                    <div>
                      <div className="dish-name">{c.dishName}</div>
                      <div className="small muted">
                        {new Date(c.checkedAt).toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" })}
                        {c.against && ` · ${c.against.venueName}`}
                      </div>
                      <MacroLine range={c.range} />
                    </div>
                    <span className="chev">▶</span>
                  </div>
                </summary>
                <div style={{ marginTop: 12 }}>
                  <CheckResult result={c} compact />
                  <button className="btn small ghost" onClick={() => remove(c.id)} style={{ marginTop: 8 }}>
                    Delete this check
                  </button>
                </div>
              </details>
            ))}
        </section>
      )}
    </div>
  );
}

const CONFIDENCE_TEXT = {
  high: "High confidence: clear photo of a simple dish.",
  medium: "Medium confidence: typical for a photo or a clear description.",
  low: "Low confidence: unclear photo, mixed dish, or text only. Treat this as rough.",
};

function CheckResult({ result, compact }: { result: PlateCheckResult; compact?: boolean }) {
  const [targets] = useTargets();
  const match = matchMacros(result.range, targets);
  const fake = { dish: { id: result.id, venueId: "", name: result.dishName, description: "", priceAud: null, portions: result.portions }, range: result.range, match };

  return (
    <div className={compact ? "stack" : "card stack"} style={compact ? undefined : { borderColor: "var(--accent)" }}>
      {!compact && (
        <div className="spread">
          <h2 style={{ margin: 0 }}>{result.dishName}</h2>
          <FitBadge result={fake} />
        </div>
      )}
      <p style={{ margin: 0 }}>{result.summary}</p>
      <MacroGrid range={result.range} targets={targets} misses={match.misses} />
      <div className="small muted">
        {CONFIDENCE_TEXT[result.confidence]} {result.usedPhoto ? "Based on your photo." : "Based on the description only."}
      </div>

      {result.against && <Comparison result={result} />}

      {result.differences.length > 0 && (
        <div className="notice info small">
          <strong>Compared with the menu:</strong>
          <ul style={{ margin: "4px 0 0", paddingLeft: "1.2em" }}>
            {result.differences.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </div>
      )}
      {result.unseen.length > 0 && (
        <div className="small">
          <strong>Can&apos;t be confirmed:</strong> {result.unseen.join("; ")}.
        </div>
      )}
      <div>
        <h3 style={{ fontSize: "0.9rem" }}>What we think is on the plate</h3>
        <ul className="ingredients">
          {result.portions.map((p) => (
            <li key={p.ingredient}>
              <span>{ingredientName(p.ingredient)}</span>
              <span className="muted">{p.grams} g</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
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
          <th>Menu estimate</th>
          <th>Your plate</th>
          <th>Difference</th>
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
              <td style={{ color: big ? (d > 0 === (k === "protein") ? "var(--accent)" : "var(--bad)") : "var(--text-2)", fontWeight: big ? 700 : 400 }}>
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
