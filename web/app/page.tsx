"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { distanceKm, formatDistance } from "@/lib/geo";
import { evaluateDish, rankResults } from "@/lib/matching";

import { Rating } from "~/components/badges";
import { DishCard } from "~/components/dish-card";
import { TargetsSummary } from "~/components/targets-summary";
import { PlainSelect } from "~/components/plain-select";
import { type Pin, VenueMap } from "~/components/venue-map";
import { api, ApiFailure } from "~/lib/api";
import { RADII, SYDNEY_AREAS } from "~/lib/areas";
import { DEFAULT_PREFS, useHydrated, useMenus, useOnboarded, usePrefs, useTargets, useVenues } from "~/lib/store";
import type { Venue } from "~/lib/types";
import { useStatus } from "~/lib/use-status";

const DEMO_AREA = SYDNEY_AREAS.find((a) => a.label === "Surry Hills")!;

const FILTERS = [
  { id: "all", label: "All" },
  { id: "cafe", label: "Cafés" },
  { id: "restaurant", label: "Dining" },
  { id: "takeaway", label: "Takeaway" },
] as const;

export default function FindFood() {
  const hydrated = useHydrated();
  const router = useRouter();
  const status = useStatus();
  const [targets] = useTargets();
  const [prefs, setPrefs] = usePrefs();
  const [onboarded, setOnboarded] = useOnboarded();
  const { menus } = useMenus();
  const { remember } = useVenues();

  const [venues, setVenues] = useState<Venue[] | null>(null);
  const [demo, setDemo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [highlight, setHighlight] = useState<string | null>(null);

  const p = hydrated ? prefs : DEFAULT_PREFS;
  const { centre, radiusM, filter, rank } = p;

  // Search whenever the area or filters change.
  useEffect(() => {
    if (!hydrated) return;
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    const q = new URLSearchParams({
      lat: String(centre.lat),
      lng: String(centre.lng),
      radius: String(radiusM),
      filter,
      rank: rank === "popular" ? "popular" : "nearest",
    });
    api<{ venues: Venue[]; demo: boolean }>(`/api/places?${q}`, { signal: ctrl.signal })
      .then((r) => {
        setVenues(r.venues);
        setDemo(r.demo);
        remember(r.venues);
      })
      .catch((e: unknown) => {
        if (ctrl.signal.aborted) return;
        setError(e instanceof ApiFailure ? e.message : "Couldn't load places.");
      })
      .finally(() => !ctrl.signal.aborted && setLoading(false));
    return () => ctrl.abort();
  }, [hydrated, centre.lat, centre.lng, radiusM, filter, rank, remember]);

  // Score every venue whose menu has been read.
  const scored = useMemo(() => {
    return (venues ?? []).map((v) => {
      const menu = menus[v.placeId];
      const results = menu ? rankResults(menu.dishes.map((d) => ({ ...evaluateDish(d, menu.confidence, targets), distanceKm: 0 }))) : null;
      const fits = results ? results.filter((r) => r.match.status === "fits").length : null;
      return { venue: v, distance: distanceKm(centre, v), results, fits };
    });
  }, [venues, menus, targets, centre]);

  const shown = p.onlyFits ? scored.filter((s) => (s.fits ?? 0) > 0) : scored;
  const pins: Pin[] = useMemo(() => scored.map((s) => ({ ...s.venue, fits: s.fits })), [scored]);

  const bestNearby = useMemo(() => {
    const all = scored.flatMap((s) =>
      (s.results ?? []).filter((r) => r.match.status === "fits" || r.fixingTweak).map((r) => ({ ...r, venue: s.venue, distanceKm: s.distance })),
    );
    return rankResults(all).slice(0, 6);
  }, [scored]);

  const readCount = scored.filter((s) => s.results).length;

  function setCentre(c: { lat: number; lng: number; label: string }) {
    setPrefs((old) => ({ ...old, centre: c }));
  }

  function locate() {
    if (!navigator.geolocation) {
      setError("This browser can't share your location. Pick an area instead.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setMe(here);
        setCentre({ ...here, label: "Your location" });
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        setError(
          err.code === err.PERMISSION_DENIED
            ? "Location is blocked for this site. Allow it in your browser settings, or pick an area."
            : "Couldn't get your location. Pick an area instead.",
        );
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  }

  function pick(placeId: string) {
    setHighlight(placeId);
    document.getElementById(`venue-${placeId}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  const areaValue = SYDNEY_AREAS.some((a) => a.label === centre.label) ? centre.label : "";

  return (
    <div className="stack-lg">
      <section className="stack">
        <div>
          <div className="eyebrow">Food that fits</div>
          <h1 className="row" style={{ gap: 6, marginTop: 6 }}>
            <span>Near</span>
            <PlainSelect
              value={areaValue}
              label={locating ? "finding you…" : centre.label === "Map pin" ? "the map pin" : centre.label === "Your location" ? "you" : centre.label}
              ariaLabel="Area"
              onChange={(v) => {
                if (v === "__me") return locate();
                const a = SYDNEY_AREAS.find((x) => x.label === v);
                if (a) setCentre(a);
              }}
            >
              {!areaValue && <option value="">{centre.label}</option>}
              <option value="__me">My location</option>
              {SYDNEY_AREAS.map((a) => (
                <option key={a.label} value={a.label}>
                  {a.label}
                </option>
              ))}
            </PlainSelect>
          </h1>
        </div>

        {hydrated && <TargetsSummary targets={targets} />}

        {hydrated && !onboarded && (
          <p className="small">
            New here? <Link href="/targets" className="link" onClick={() => setOnboarded(true)}>Set your targets</Link>
            <span className="faint"> or </span>
            <button className="link quiet" onClick={() => setOnboarded(true)}>
              keep the defaults
            </button>
          </p>
        )}

        {status && !status.google && (
          <p className="notice">
            <b>Demo.</b> Google isn&apos;t connected, so these are made-up venues in Surry Hills.{" "}
            {Math.abs(centre.lat - DEMO_AREA.lat) + Math.abs(centre.lng - DEMO_AREA.lng) > 0.01 && (
              <button className="link" onClick={() => setCentre(DEMO_AREA)}>
                Go there
              </button>
            )}
          </p>
        )}
        {status && status.google && !status.claude && (
          <p className="notice">
            <b>Menu reading is off</b> until a Claude API key is added.
          </p>
        )}

        <div className="row" style={{ gap: 12, rowGap: 10 }}>
          <div className="seg" role="group" aria-label="Distance">
            {RADII.map((r) => (
              <button key={r.m} className={radiusM === r.m ? "on" : undefined} onClick={() => setPrefs((o) => ({ ...o, radiusM: r.m }))}>
                {r.label}
              </button>
            ))}
          </div>
          <div className="seg" role="group" aria-label="Type of place">
            {FILTERS.map((f) => (
              <button key={f.id} className={filter === f.id ? "on" : undefined} onClick={() => setPrefs((o) => ({ ...o, filter: f.id }))}>
                {f.label}
              </button>
            ))}
          </div>
          <PlainSelect
            className="small muted"
            value={rank}
            label={rank === "popular" ? "Most popular" : "Nearest"}
            ariaLabel="Sort"
            onChange={(v) => setPrefs((o) => ({ ...o, rank: v as "nearest" | "popular" }))}
          >
            <option value="nearest">Nearest</option>
            <option value="popular">Most popular</option>
          </PlainSelect>
          <label className="check">
            <input type="checkbox" checked={p.onlyFits} onChange={(e) => setPrefs((o) => ({ ...o, onlyFits: e.target.checked }))} />
            Only with dishes that fit
          </label>
        </div>
        {error && <p className="notice error">{error}</p>}
      </section>

      <div className="finder">
        <div className="stack" aria-busy={loading}>
          <div className="spread small muted">
            <span>{loading ? "Searching…" : `${shown.length} place${shown.length === 1 ? "" : "s"}`}</span>
            {readCount > 0 && <span>{readCount} menu{readCount === 1 ? "" : "s"} read</span>}
          </div>

          <div className="list">
            {loading && !venues && [0, 1, 2, 3].map((i) => <div key={i} className="item"><div className="skeleton" style={{ height: 40 }} /></div>)}

            {!loading && venues && shown.length === 0 && (
              <p className="empty small">
                {p.onlyFits ? (
                  <>
                    No menus read here have dishes that fit yet.{" "}
                    <button className="link" onClick={() => setPrefs((o) => ({ ...o, onlyFits: false }))}>
                      Show all places
                    </button>
                  </>
                ) : demo ? (
                  "The demo venues are all in Surry Hills."
                ) : (
                  "Nothing found. Try a wider distance."
                )}
              </p>
            )}

            {shown.map(({ venue: v, distance, results, fits }) => {
              const best = results?.[0];
              return (
                <Link
                  key={v.placeId}
                  id={`venue-${v.placeId}`}
                  href={`/venue/${encodeURIComponent(v.placeId)}`}
                  className={`item${highlight === v.placeId ? " on" : ""}`}
                  onMouseEnter={() => setHighlight(v.placeId)}
                >
                  <div className="spread">
                    <span className="item-title">{v.name}</span>
                    {!v.demo && <Rating rating={v.rating} count={v.ratingCount} />}
                  </div>
                  <div className="small muted" style={{ marginTop: 2 }}>
                    {[v.cuisine ?? v.kind, formatDistance(distance), v.price].filter(Boolean).join(" · ")}
                    {v.openNow === false && <span className="faint"> · Closed</span>}
                  </div>
                  <div className="small" style={{ marginTop: 6 }}>
                    {results == null ? (
                      <span className="faint">Tap to read the menu</span>
                    ) : results.length === 0 ? (
                      <span className="faint">No dishes found</span>
                    ) : fits ? (
                      <span>
                        <span className="fit yes">{fits} fit</span>
                        {best && <span className="muted"> · {best.dish.name}, {best.range.mid.calories} kcal, {best.range.mid.protein}g protein</span>}
                      </span>
                    ) : (
                      <span className="fit no">None of {results.length} fit</span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
          {!demo && venues && venues.length >= 20 && (
            <p className="tiny faint">Google shows up to 20 places per search. Narrow the distance or type to see others.</p>
          )}
        </div>

        <div className="map-col stack-sm">
          <VenueMap
            centre={centre}
            radiusM={radiusM}
            pins={pins}
            me={me}
            highlight={highlight}
            onPick={(id) => (highlight === id ? router.push(`/venue/${encodeURIComponent(id)}`) : pick(id))}
            onMove={(pt) => setCentre({ ...pt, label: "Map pin" })}
          />
          <p className="tiny faint">Tap the map to search there. Green pins have dishes that fit.</p>
        </div>
      </div>

      {bestNearby.length > 0 && (
        <section className="stack">
          <h2>Best fits nearby</h2>
          <div className="list">
            {bestNearby.map((r) => (
              <DishCard key={`${r.venue.placeId}-${r.dish.id}`} result={r} targets={targets} placeId={r.venue.placeId} venueName={`${r.venue.name}, ${formatDistance(r.distanceKm)}`} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
