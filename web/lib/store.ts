"use client";
/**
 * Everything the site remembers lives in this browser (localStorage): your targets,
 * where you last searched, menus already read, and your plate checks. Nothing is
 * stored on a server, so there are no accounts and nothing to leak.
 */
import { useCallback, useSyncExternalStore } from "react";

import { DEFAULT_TARGETS, type Targets } from "@/lib/matching";

import type { PlateCheckResult, Venue, VenueMenu } from "./types";

export const SYDNEY_CBD = { lat: -33.8731, lng: 151.2065, label: "Sydney CBD" };

export type SearchPrefs = {
  centre: { lat: number; lng: number; label: string };
  radiusM: number;
  filter: "all" | "cafe" | "restaurant" | "takeaway";
  rank: "nearest" | "popular";
  onlyFits: boolean;
};

export const DEFAULT_PREFS: SearchPrefs = {
  centre: SYDNEY_CBD,
  radiusM: 1000,
  filter: "all",
  rank: "nearest",
  onlyFits: false,
};

type Shape = {
  targets: Targets;
  prefs: SearchPrefs;
  menus: Record<string, VenueMenu>;
  /** Venues seen in searches, so a menu page can show the name before Google answers. */
  venues: Record<string, Venue>;
  checks: PlateCheckResult[];
  onboarded: boolean;
};

const DEFAULTS: Shape = {
  targets: DEFAULT_TARGETS,
  prefs: DEFAULT_PREFS,
  menus: {},
  venues: {},
  checks: [],
  onboarded: false,
};

const PREFIX = "macrohunter:v1:";
const MAX_MENUS = 80;
const MAX_VENUES = 300;
const MAX_CHECKS = 40;

const listeners = new Set<() => void>();
const cache = new Map<keyof Shape, unknown>();

function read<K extends keyof Shape>(key: K): Shape[K] {
  if (cache.has(key)) return cache.get(key) as Shape[K];
  let value = DEFAULTS[key];
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(PREFIX + key) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      value =
        DEFAULTS[key] && typeof DEFAULTS[key] === "object" && !Array.isArray(DEFAULTS[key])
          ? ({ ...(DEFAULTS[key] as object), ...parsed } as Shape[K])
          : parsed;
    }
  } catch {
    // Private mode or corrupt data: fall back to defaults.
  }
  if (typeof window !== "undefined") cache.set(key, value);
  return value;
}

function write<K extends keyof Shape>(key: K, value: Shape[K]) {
  cache.set(key, value);
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Storage full or blocked: keep it in memory for this visit.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key?.startsWith(PREFIX)) {
      cache.delete(e.key.slice(PREFIX.length) as keyof Shape);
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function useKey<K extends keyof Shape>(key: K): [Shape[K], (v: Shape[K] | ((old: Shape[K]) => Shape[K])) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => DEFAULTS[key],
  );
  const set = useCallback(
    (v: Shape[K] | ((old: Shape[K]) => Shape[K])) => {
      write(key, typeof v === "function" ? (v as (old: Shape[K]) => Shape[K])(read(key)) : v);
    },
    [key],
  );
  return [value, set];
}

/** False during the server render and the first browser paint, so pages can avoid flashing defaults. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export const useTargets = () => useKey("targets");
export const usePrefs = () => useKey("prefs");
export const useOnboarded = () => useKey("onboarded");

export function useMenus() {
  const [menus, set] = useKey("menus");
  const save = useCallback(
    (menu: VenueMenu) =>
      set((old) => {
        const next = { ...old, [menu.placeId]: menu };
        const keys = Object.keys(next);
        if (keys.length > MAX_MENUS) {
          keys
            .sort((a, b) => next[a].readAt.localeCompare(next[b].readAt))
            .slice(0, keys.length - MAX_MENUS)
            .forEach((k) => delete next[k]);
        }
        return next;
      }),
    [set],
  );
  const remove = useCallback(
    (placeId: string) =>
      set((old) => {
        const next = { ...old };
        delete next[placeId];
        return next;
      }),
    [set],
  );
  return { menus, save, remove };
}

export function useVenues() {
  const [venues, set] = useKey("venues");
  const remember = useCallback(
    (list: Venue[]) =>
      set((old) => {
        const next = { ...old };
        for (const v of list) {
          delete next[v.placeId];
          next[v.placeId] = v;
        }
        const keys = Object.keys(next);
        keys.slice(0, Math.max(0, keys.length - MAX_VENUES)).forEach((k) => delete next[k]);
        return next;
      }),
    [set],
  );
  return { venues, remember };
}

export function useChecks() {
  const [checks, set] = useKey("checks");
  const add = useCallback(
    (c: PlateCheckResult) => set((old) => [c, ...old.filter((o) => o.id !== c.id)].slice(0, MAX_CHECKS)),
    [set],
  );
  const remove = useCallback((id: string) => set((old) => old.filter((c) => c.id !== id)), [set]);
  return { checks, add, remove };
}

export function clearEverything() {
  try {
    Object.keys(window.localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => window.localStorage.removeItem(k));
  } catch {
    // ignore
  }
  cache.clear();
  listeners.forEach((l) => l());
}
