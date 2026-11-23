"use client";
/**
 * The radius map. Leaflet with OpenStreetMap tiles: free and needs no key.
 * Pins: green when a read menu has dishes that fit, grey when the menu isn't read yet.
 */
import type * as L from "leaflet";
import { useEffect, useRef } from "react";

import type { Venue } from "~/lib/types";

export type Pin = Venue & { fits: number | null };

export function VenueMap({
  centre,
  radiusM,
  pins,
  me,
  highlight,
  onPick,
  onMove,
}: {
  centre: { lat: number; lng: number };
  radiusM: number;
  pins: Pin[];
  me: { lat: number; lng: number } | null;
  highlight: string | null;
  onPick: (placeId: string) => void;
  /** Called when the person clicks the map to move the search centre. */
  onMove: (p: { lat: number; lng: number }) => void;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layers = useRef<L.LayerGroup | null>(null);
  const lib = useRef<typeof L | null>(null);
  const lastFit = useRef("");
  const resizeObs = useRef<ResizeObserver | null>(null);
  const handlers = useRef({ onPick, onMove });
  handlers.current = { onPick, onMove };

  // Create the map once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const leaflet = await import("leaflet");
      if (cancelled || !el.current || map.current) return;
      lib.current = leaflet;
      const m = leaflet.map(el.current, { zoomControl: false, attributionControl: true }).setView([centre.lat, centre.lng], 15);
      leaflet
        .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        })
        .addTo(m);
      m.on("click", (e: L.LeafletMouseEvent) => handlers.current.onMove({ lat: e.latlng.lat, lng: e.latlng.lng }));
      layers.current = leaflet.layerGroup().addTo(m);
      map.current = m;
      // Re-measure when the layout changes size (phone rotation, sidebar moves).
      const ro = new ResizeObserver(() => m.invalidateSize());
      ro.observe(el.current);
      resizeObs.current = ro;
      draw();
    })();
    return () => {
      cancelled = true;
      resizeObs.current?.disconnect();
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function draw() {
    const leaflet = lib.current;
    const m = map.current;
    const group = layers.current;
    if (!leaflet || !m || !group) return;
    group.clearLayers();
    const circle = leaflet
      .circle([centre.lat, centre.lng], {
        radius: radiusM,
        color: "#2f7a52",
        weight: 1.5,
        dashArray: "4 4",
        fillColor: "#2f7a52",
        fillOpacity: 0.06,
        interactive: false,
      })
      .addTo(group);
    leaflet
      .marker([centre.lat, centre.lng], {
        icon: leaflet.divIcon({ className: "", html: '<div style="width:8px;height:8px;border-radius:50%;background:#2f7a52;border:2px solid #fff"></div>', iconSize: [8, 8] }),
        interactive: false,
      })
      .addTo(group);
    if (me) {
      leaflet
        .marker([me.lat, me.lng], { icon: leaflet.divIcon({ className: "", html: '<div class="mh-me"></div>', iconSize: [16, 16] }), title: "You" })
        .addTo(group);
    }
    for (const p of pins) {
      const colour = p.fits == null ? "#a7ada3" : p.fits > 0 ? "#2f7a52" : "#d99a2b";
      const big = p.placeId === highlight;
      const size = p.fits ? (big ? 26 : 22) : big ? 18 : 14;
      leaflet
        .marker([p.lat, p.lng], {
          icon: leaflet.divIcon({
            className: "",
            html: `<div class="mh-pin" style="background:${colour};width:${size}px;height:${size}px">${p.fits ? p.fits : ""}</div>`,
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2],
          }),
          title: p.name,
          zIndexOffset: big ? 1000 : p.fits ? 500 : 0,
          keyboard: true,
        })
        .on("click", () => handlers.current.onPick(p.placeId))
        .addTo(group);
    }
    // Only re-frame the map when the search area changes, not on every highlight.
    const fitKey = `${centre.lat},${centre.lng},${radiusM}`;
    if (lastFit.current !== fitKey) {
      lastFit.current = fitKey;
      m.invalidateSize();
      m.fitBounds(circle.getBounds(), { padding: [12, 12] });
    }
  }

  useEffect(draw, [centre.lat, centre.lng, radiusM, pins, me, highlight]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={el} className="map" role="region" aria-label="Map of venues within your radius. Click the map to search somewhere else." />;
}
