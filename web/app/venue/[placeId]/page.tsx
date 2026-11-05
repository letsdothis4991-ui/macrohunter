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
      <div className="stack">
        <Link href="/" className="small">
          ← Back to places
        </Link>
        {venueError ? <div className="notice bad">{venueError}</div> : <div className="skeleton" style={{ height: 120 }} />}
      </div>
    );
  }

  const dist = distanceKm(prefs.centre, venue);

  return (
    <div className="stack">
      <Link href="/" className="small">
        ← Back to places
      </Link>

      <div className="card">
        <div className="spread" style={{ alignItems: "flex-start" }}>
          <div>
            <h1 style={{ marginBottom: 2 }}>
              {venue.name} {venue.demo && <span className="badge demo">Demo venue</span>}
            </h1>
            <div className="muted small">
              {[venue.kind, (menu?.cuisine ?? venue.cuisine) !== venue.kind ? (menu?.cuisine ?? venue.cuisine) : null, venue.price, hydrated ? `${formatDistance(dist)} from ${prefs.centre.label}` : null]
                .filter(Boolean)
                .join(" · ")}
              {venue.openNow != null && (
                <span style={{ color: venue.openNow ? "var(--accent)" : "var(--bad)" }}> · {venue.openNow ? "Open now" : "Closed now"}</span>
              )}
            </div>
            <div className="small muted">{venue.address}</div>
          </div>
          {!venue.demo && <Rating rating={venue.rating} count={venue.ratingCount} />}
        </div>
        <div className="row" style={{ marginTop: 10 }}>
          {venue.mapsUrl && (
            <a className="btn small" href={venue.mapsUrl} target="_blank" rel="noreferrer">
              Open in Google Maps
            </a>
          )}
          {venue.website && (
            <a className="btn small" href={venue.website} target="_blank" rel="noreferrer">
              Website
            </a>
          )}
          <span className="badge est" title="Every dish is estimated from the menu description. Venue verification comes later.">
            Venue not verified yet
          </span>
        </div>
      </div>

      {hydrated && <TargetsSummary targets={targets} />}

      {reading && <ReadingProgress reading={reading} />}

      {readError && !reading && (
        <div className={`notice ${readError.code === "no_claude" ? "warn" : "bad"}`}>
          {readError.message}
          {(readError.code === "no_menu" || readError.code === "no_website") && " You can give it the menu another way below."}
        </div>
      )}

      {!reading && (showInput || (!menu && readError)) && status?.claude !== false && !venue.demo && (
        <div className="card">
          <h2>Give MacroHunter the menu</h2>
          <MenuInput hasWebsite={Boolean(venue.website)} busy={Boolean(reading)} onSubmit={(s) => read(s, venue.name)} />
        </div>
      )}

      {menu && (
        <>
          <div className="spread">
            <div>
              <h2 style={{ margin: 0 }}>
                {fitsOutright} of {results.length} dishes fit your targets
              </h2>
              {fitting.length > fitsOutright && (
                <div className="small muted">
                  {fitting.length - fitsOutright} more fit{fitting.length - fitsOutright === 1 ? "s" : ""} with a simple change
                </div>
              )}
              {fitting.length === 0 && results.length > 0 && <div className="small muted">Showing the closest options first.</div>}
            </div>
            <div className="row">
              <button className={`chip${view === "fits" ? " on" : ""}`} onClick={() => setView("fits")}>
                Fits ({fitting.length})
              </button>
              <button className={`chip${view === "all" ? " on" : ""}`} onClick={() => setView("all")}>
                All dishes ({results.length})
              </button>
            </div>
          </div>
          {results.length > 6 && (
            <input className="input" type="search" placeholder="Search this menu" value={query} onChange={(e) => setQuery(e.target.value)} />
          )}

          {list.length === 0 && (
            <div className="card empty">
              {view === "fits" ? (
                <>
                  Nothing here fits your targets.{" "}
                  <button className="btn small" onClick={() => setView("all")}>
                    See the closest options
                  </button>
                </>
              ) : (
                "No dishes match that search."
              )}
            </div>
          )}

          <div>
            {list.map((r, i) => (
              <DishCard key={r.dish.id} result={r} targets={targets} placeId={placeId} open={i === 0 && !q} />
            ))}
          </div>

          <div className="card small muted stack">
            <div>
              Read from{" "}
              {menu.source.kind === "website" || menu.source.kind === "link" ? (
                <a href={menu.source.url} target="_blank" rel="noreferrer">
                  {new URL(menu.source.url).hostname}
                </a>
              ) : menu.source.kind === "photos" ? (
                `${menu.source.count} menu photo${menu.source.count === 1 ? "" : "s"}`
              ) : menu.source.kind === "pasted" ? (
                "pasted menu text"
              ) : (
                "sample data"
              )}
              {menu.source.kind !== "demo" && ` on ${new Date(menu.readAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}`}
              . Saved in this browser.
            </div>
            {menu.skipped.length > 0 && (
              <details>
                <summary style={{ cursor: "pointer" }}>{menu.skipped.length} item(s) left out</summary>
                <ul>
                  {menu.skipped.map((s) => (
                    <li key={s.name}>
                      {s.name}: {s.reason}
                    </li>
                  ))}
                </ul>
              </details>
            )}
            {!venue.demo && status?.claude && (
              <div className="row">
                <button className="btn small" onClick={() => setShowInput((v) => !v)}>
                  Menu wrong or out of date?
                </button>
                <button
                  className="btn small ghost"
                  onClick={() => {
                    if (confirm("Forget this menu? You can read it again any time.")) remove(placeId);
                  }}
                >
                  Forget this menu
                </button>
              </div>
            )}
          </div>
        </>
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
    <div className="card stack" aria-live="polite">
      <div className="row">
        <span className="spinner" />
        <strong>{reading.label}…</strong>
        <span className="muted small">{secs}s</span>
      </div>
      <div className="progress">
        <div style={{ width: `${pct}%` }} />
      </div>
      <div className="small muted">{step}. This usually takes under a minute, and only happens the first time.</div>
    </div>
  );
}
