"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { distanceKm, formatDistance } from "@/lib/geo";
import { evaluateDish, rankResults } from "@/lib/matching";

import { FitBadge, Rating } from "~/components/badges";
import { DishCard } from "~/components/dish-card";
import { MacroLine } from "~/components/macro-grid";
import { TargetsSummary } from "~/components/targets-summary";
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
  { id: "restaurant", label: "Restaurants" },
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
  const listRef = useRef<HTMLDivElement>(null);

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
    <div className="stack">
      {hydrated && !onboarded && (
        <div className="card" style={{ borderColor: "var(--accent)" }}>
          <h2>Welcome to MacroHunter</h2>
          <p className="muted">
            Find dishes near you that fit your macros. Set your per-meal targets, pick an area, then open a venue: MacroHunter reads its menu and
            estimates every dish as a range.
          </p>
          <div className="row">
            <Link href="/targets" className="btn primary" onClick={() => setOnboarded(true)}>
              Set my targets
            </Link>
            <button className="btn" onClick={() => setOnboarded(true)}>
              Use the defaults
            </button>
            <Link href="/how-it-works" className="btn ghost">
              How it works
            </Link>
          </div>
        </div>
      )}

      {status && !status.google && (
        <div className="notice warn">
          <strong>Demo mode.</strong> Google isn&apos;t connected yet, so you&apos;re seeing fictional sample venues in Surry Hills with made-up menus.{" "}
          {Math.abs(centre.lat - DEMO_AREA.lat) + Math.abs(centre.lng - DEMO_AREA.lng) > 0.01 && (
            <button className="btn small" onClick={() => setCentre(DEMO_AREA)}>
              Go to the demo area
            </button>
          )}
        </div>
      )}
      {status && status.google && !status.claude && (
        <div className="notice warn">
          <strong>Menu reading is off.</strong> Venues and ratings work, but menus can&apos;t be read until a Claude API key is added.
        </div>
      )}

      {hydrated && <TargetsSummary targets={targets} />}

      <div className="card stack">
        <div className="spread">
          <h1 style={{ margin: 0, fontSize: "1.3rem" }}>Food near {centre.label}</h1>
          <button className="btn" onClick={locate} disabled={locating}>
            {locating ? <span className="spinner" /> : "📍"} Use my location
          </button>
        </div>
        <div className="row">
          <select
            className="select"
            style={{ width: "auto", minWidth: 170 }}
            value={areaValue}
            aria-label="Pick an area"
            onChange={(e) => {
              const a = SYDNEY_AREAS.find((x) => x.label === e.target.value);
              if (a) setCentre(a);
            }}
          >
            <option value="" disabled>
              {centre.label === "Your location" ? "Your location" : centre.label === "Map pin" ? "Spot on the map" : "Pick an area"}
            </option>
            {SYDNEY_AREAS.map((a) => (
              <option key={a.label} value={a.label}>
                {a.label}
              </option>
            ))}
          </select>
          <div className="row" role="group" aria-label="Radius">
            {RADII.map((r) => (
              <button key={r.m} className={`chip${radiusM === r.m ? " on" : ""}`} onClick={() => setPrefs((o) => ({ ...o, radiusM: r.m }))}>
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <div className="row">
          {FILTERS.map((f) => (
            <button key={f.id} className={`chip${filter === f.id ? " on" : ""}`} onClick={() => setPrefs((o) => ({ ...o, filter: f.id }))}>
              {f.label}
            </button>
          ))}
          <select
            className="select"
            style={{ width: "auto" }}
            value={rank}
            aria-label="Sort venues"
            onChange={(e) => setPrefs((o) => ({ ...o, rank: e.target.value as "nearest" | "popular" }))}
          >
            <option value="nearest">Nearest first</option>
            <option value="popular">Most popular first</option>
          </select>
          <label className="chip" style={{ cursor: "pointer" }}>
            <input type="checkbox" checked={p.onlyFits} onChange={(e) => setPrefs((o) => ({ ...o, onlyFits: e.target.checked }))} />
            Only places with dishes that fit
          </label>
        </div>
      </div>

      {error && <div className="notice bad">{error}</div>}

      <div className="finder">
        <div ref={listRef} className="stack" aria-busy={loading}>
          <div className="spread">
            <h2 style={{ margin: 0 }}>
              {loading ? "Searching…" : `${shown.length} place${shown.length === 1 ? "" : "s"}`}
              {demo && <span className="badge demo" style={{ marginLeft: 8, verticalAlign: "middle" }}>Demo</span>}
            </h2>
            {readCount > 0 && <span className="small muted">{readCount} menu{readCount === 1 ? "" : "s"} read</span>}
          </div>

          {loading && !venues && [0, 1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 92 }} />)}

          {!loading && venues && shown.length === 0 && (
            <div className="card empty">
              {p.onlyFits ? (
                <>
                  No read menus here have dishes that fit yet. Open a few venues to read their menus, or{" "}
                  <button className="btn small" onClick={() => setPrefs((o) => ({ ...o, onlyFits: false }))}>
                    show all places
                  </button>
                </>
              ) : demo ? (
                "The demo venues are all in Surry Hills. Pick Surry Hills or a bigger radius."
              ) : (
                "No places found. Try a bigger radius or another area."
              )}
            </div>
          )}

          {shown.map(({ venue: v, distance, results, fits }) => {
            const best = results?.[0];
            return (
              <Link
                key={v.placeId}
                id={`venue-${v.placeId}`}
                href={`/venue/${encodeURIComponent(v.placeId)}`}
                className={`card venue-card${highlight === v.placeId ? " highlight" : ""}`}
                onMouseEnter={() => setHighlight(v.placeId)}
              >
                <div className="spread" style={{ alignItems: "flex-start" }}>
                  <div style={{ minWidth: 0 }}>
                    <div className="venue-name">{v.name}</div>
                    <div className="small muted">
                      {[v.kind, v.cuisine !== v.kind ? v.cuisine : null, formatDistance(distance), v.price].filter(Boolean).join(" · ")}
                      {v.openNow != null && (
                        <span style={{ color: v.openNow ? "var(--accent)" : "var(--bad)" }}> · {v.openNow ? "Open now" : "Closed"}</span>
                      )}
                    </div>
                  </div>
                  {!v.demo && <Rating rating={v.rating} count={v.ratingCount} />}
                </div>
                <div style={{ marginTop: 8 }}>
                  {results == null ? (
                    <span className="small muted">Menu not read yet. Open to read it →</span>
                  ) : results.length === 0 ? (
                    <span className="small muted">No dishes found on the menu.</span>
                  ) : (
                    <div className="small">
                      <strong style={{ color: fits ? "var(--accent)" : "var(--warn)" }}>
                        {fits} of {results.length} dishes fit
                      </strong>
                      {best && (
                        <div className="row" style={{ marginTop: 2 }}>
                          <span>Best: {best.dish.name}</span>
                          <FitBadge result={best} />
                          <MacroLine range={best.range} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
          {!demo && venues && venues.length >= 20 && (
            <p className="tiny muted">Google returns up to 20 places per search. Try a smaller radius, a filter, or &quot;Most popular first&quot; to see others.</p>
          )}
        </div>

        <div className="map-col stack">
          <VenueMap
            centre={centre}
            radiusM={radiusM}
            pins={pins}
            me={me}
            highlight={highlight}
            onPick={(id) => (highlight === id ? router.push(`/venue/${encodeURIComponent(id)}`) : pick(id))}
            onMove={(pt) => setCentre({ ...pt, label: "Map pin" })}
          />
          <p className="tiny muted" style={{ margin: 0 }}>
            Tap the map to search there. Pins show how many dishes fit: <span style={{ color: "#1d7a50" }}>●</span> some fit,{" "}
            <span style={{ color: "#c98a12" }}>●</span> none fit, <span style={{ color: "#8a918c" }}>●</span> menu not read yet. Tap a pin twice to open it.
          </p>
        </div>
      </div>

      {bestNearby.length > 0 && (
        <section>
          <h2 className="section-title">Best fits nearby</h2>
          <p className="small muted">From the menus you&apos;ve opened in this area.</p>
          {bestNearby.map((r) => (
            <DishCard key={`${r.venue.placeId}-${r.dish.id}`} result={r} targets={targets} placeId={r.venue.placeId} venueName={`${r.venue.name} · ${formatDistance(r.distanceKm)}`} />
          ))}
        </section>
      )}
    </div>
  );
}
