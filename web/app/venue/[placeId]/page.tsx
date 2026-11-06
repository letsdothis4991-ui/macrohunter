"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { distanceKm, formatDistance } from "@/lib/geo";
import { evaluateDish, rankResults } from "@/lib/matching";

import { Rating } from "~/components/badges";
import { DishCard } from "~/components/dish-card";
import { MenuInput, type MenuSubmission } from "~/components/menu-input";
import { TargetsSummary } from "~/components/targets-summary";
import { api, ApiFailure } from "~/lib/api";
import { useHydrated, useMenus, usePrefs, useTargets, useVenues } from "~/lib/store";
import type { Venue, VenueMenu } from "~/lib/types";
import { useStatus } from "~/lib/use-status";

type Reading = { startedAt: number; label: string } | null;

export default function VenuePage() {
  const { placeId: raw } = useParams<{ placeId: string }>();
  const placeId = decodeURIComponent(raw);
  const hydrated = useHydrated();
  const status = useStatus();
  const [targets] = useTargets();
  const [prefs] = usePrefs();
  const { menus, save, remove } = useMenus();
  const { venues, remember } = useVenues();

  const [fresh, setFresh] = useState<Venue | null>(null);
  const [venueError, setVenueError] = useState<string | null>(null);
  const [reading, setReading] = useState<Reading>(null);
  const [readError, setReadError] = useState<{ message: string; code?: string } | null>(null);
  const [showInput, setShowInput] = useState(false);
  const [chosenView, setView] = useState<"fits" | "all" | null>(null);
  const [query, setQuery] = useState("");
  const autoStarted = useRef(false);

  const venue = fresh ?? (hydrated ? venues[placeId] : undefined) ?? null;
  const menu: VenueMenu | undefined = hydrated ? menus[placeId] : undefined;

  // Always fetch fresh details: ratings and opening hours come live from Google.
  useEffect(() => {
    api<{ venue: Venue }>(`/api/venue/${encodeURIComponent(placeId)}`)
      .then((r) => {
        setFresh(r.venue);
        remember([r.venue]);
      })
      .catch((e: unknown) => setVenueError(e instanceof ApiFailure ? e.message : "Couldn't load this venue."));
  }, [placeId, remember]);

  const read = useCallback(
    async (source: MenuSubmission, name: string) => {
      setReadError(null);
      setReading({
        startedAt: Date.now(),
        label:
          source.kind === "website"
            ? "Reading the menu from the venue's website"
            : source.kind === "photos"
              ? "Reading your menu photos"
              : source.kind === "link"
                ? "Reading that page"
                : "Reading the menu text",
      });
      try {
        const r = await api<{ menu: VenueMenu }>("/api/menu", {
          method: "POST",
          body: JSON.stringify({ placeId, venueName: name, source }),
        });
        save(r.menu);
        setShowInput(false);
      } catch (e) {
        setReadError(e instanceof ApiFailure ? { message: e.message, code: e.code } : { message: "Couldn't read the menu." });
        setShowInput(true);
      } finally {
        setReading(null);
      }
    },
    [placeId, save],
  );

  // First visit: read the menu automatically (demo menus are free and instant).
  useEffect(() => {
    if (!hydrated || !venue || !status || menu || reading || autoStarted.current) return;
    autoStarted.current = true;
    if (venue.demo) {
      read({ kind: "website" }, venue.name);
    } else if (!status.claude) {
      setReadError({ message: "Menu reading is off until a Claude API key is added.", code: "no_claude" });
    } else if (venue.website) {
      read({ kind: "website" }, venue.name);
    } else {
      setReadError({ message: "Google doesn't list a website for this venue, so there's no menu to read automatically.", code: "no_website" });
      setShowInput(true);
    }
  }, [hydrated, venue, status, menu, reading, read]);

  const results = useMemo(() => {
    if (!menu) return [];
    return rankResults(menu.dishes.map((d) => ({ ...evaluateDish(d, menu.confidence, targets), distanceKm: 0 })));
  }, [menu, targets]);

  const fitting = results.filter((r) => r.match.status === "fits" || r.fixingTweak);
  const fitsOutright = results.filter((r) => r.match.status === "fits").length;
  // With nothing fitting, start on the closest options rather than an empty list.
  const view = chosenView ?? (fitting.length > 0 ? "fits" : "all");
  const q = query.trim().toLowerCase();
  const list = (view === "fits" ? fitting : results).filter(
    (r) => !q || r.dish.name.toLowerCase().includes(q) || r.dish.description.toLowerCase().includes(q),
  );

  if (!venue) {
    return (
      <div className="stack narrow">
        <Link href="/" className="small muted">
          ← Places
        </Link>
        {venueError ? <p className="notice error">{venueError}</p> : <div className="skeleton" style={{ height: 80 }} />}
      </div>
    );
  }

  const dist = distanceKm(prefs.centre, venue);
  const cuisine = menu?.cuisine ?? venue.cuisine ?? venue.kind;

  return (
    <div className="stack-lg narrow">
      <section className="stack">
        <Link href="/" className="small muted">
          ← Places
        </Link>
        <div className="stack-sm">
          <h1>{venue.name}</h1>
          <p className="muted small">
            {[cuisine, venue.price, hydrated ? formatDistance(dist) : null, venue.address].filter(Boolean).join(" · ")}
            {venue.openNow != null && <span className={venue.openNow ? undefined : "faint"}> · {venue.openNow ? "Open now" : "Closed"}</span>}
          </p>
          <div className="row small" style={{ gap: 18 }}>
            {!venue.demo && <Rating rating={venue.rating} count={venue.ratingCount} />}
            {venue.mapsUrl && (
              <a className="link quiet" href={venue.mapsUrl} target="_blank" rel="noreferrer">
                Google Maps ↗
              </a>
            )}
            {venue.website && (
              <a className="link quiet" href={venue.website} target="_blank" rel="noreferrer">
                Website ↗
              </a>
            )}
            {venue.demo && <span className="faint">Demo venue</span>}
          </div>
        </div>
        {hydrated && <TargetsSummary targets={targets} />}
      </section>

      {reading && <ReadingProgress reading={reading} />}

      {readError && !reading && <p className={`notice${readError.code === "no_claude" ? "" : " error"}`}>{readError.message}</p>}

      {!reading && (showInput || (!menu && readError)) && status?.claude !== false && !venue.demo && (
        <section className="stack">
          <h2>Add the menu</h2>
          <MenuInput hasWebsite={Boolean(venue.website)} busy={Boolean(reading)} onSubmit={(s) => read(s, venue.name)} />
        </section>
      )}

      {menu && (
        <section className="stack">
          <div className="spread">
            <div>
              <h2>
                {fitsOutright} of {results.length} dishes fit
              </h2>
              {fitting.length > fitsOutright && (
                <p className="small muted">
                  {fitting.length - fitsOutright} more with a small change
                </p>
              )}
              {fitting.length === 0 && results.length > 0 && <p className="small muted">Closest options first.</p>}
            </div>
            <div className="seg">
              <button className={view === "fits" ? "on" : undefined} onClick={() => setView("fits")}>
                Fits
              </button>
              <button className={view === "all" ? "on" : undefined} onClick={() => setView("all")}>
                All {results.length}
              </button>
            </div>
          </div>
          {results.length > 8 && (
            <input className="input" type="search" placeholder="Search the menu" value={query} onChange={(e) => setQuery(e.target.value)} />
          )}

          <div className="list">
            {list.length === 0 && (
              <p className="empty small">
                {view === "fits" ? (
                  <>
                    Nothing fits your targets.{" "}
                    <button className="link" onClick={() => setView("all")}>
                      See the closest options
                    </button>
                  </>
                ) : (
                  "No dishes match."
                )}
              </p>
            )}
            {list.map((r, i) => (
              <DishCard key={r.dish.id} result={r} targets={targets} placeId={placeId} open={i === 0 && !q} />
            ))}
          </div>

          <div className="tiny faint stack-sm">
            <p>
              Read from{" "}
              {menu.source.kind === "website" || menu.source.kind === "link" ? (
                <a className="link quiet" href={menu.source.url} target="_blank" rel="noreferrer">
                  {new URL(menu.source.url).hostname}
                </a>
              ) : menu.source.kind === "photos" ? (
                `${menu.source.count} photo${menu.source.count === 1 ? "" : "s"}`
              ) : menu.source.kind === "pasted" ? (
                "pasted text"
              ) : (
                "sample data"
              )}
              {menu.source.kind !== "demo" && `, ${new Date(menu.readAt).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}`}.
              {menu.skipped.length > 0 && ` Left out: ${menu.skipped.map((x) => x.name).join(", ")} (too vague to estimate).`}
            </p>
            {!venue.demo && status?.claude && (
              <p className="row" style={{ gap: 16 }}>
                <button className="link quiet" onClick={() => setShowInput((v) => !v)}>
                  Menu wrong?
                </button>
                <button
                  className="link quiet"
                  onClick={() => {
                    if (confirm("Forget this menu? You can read it again any time.")) remove(placeId);
                  }}
                >
                  Forget menu
                </button>
              </p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function ReadingProgress({ reading }: { reading: NonNullable<Reading> }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);
  const secs = Math.max(0, Math.round((now - reading.startedAt) / 1000));
  // Most menus take 20 to 60 seconds. Ease towards 95% so the bar never looks stuck.
  const pct = Math.min(95, 100 * (1 - Math.exp(-secs / 30)));
  const step =
    secs < 6 ? "Fetching the menu" : secs < 20 ? "Working out the ingredients in each dish" : secs < 45 ? "Estimating portion sizes" : "Almost there, long menus take a bit longer";
  return (
    <div className="stack-sm" aria-live="polite">
      <p className="small">
        <span className="spinner" /> &nbsp;{reading.label}… <span className="faint">{secs}s</span>
      </p>
      <div className="progress">
        <div style={{ width: `${pct}%` }} />
      </div>
      <p className="tiny faint">{step}. Usually under a minute, and only the first time.</p>
    </div>
  );
}
