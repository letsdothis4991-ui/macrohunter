import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "About" };

const STEPS = [
  {
    title: "Places",
    body: "Venues, ratings, prices and opening hours come live from Google every time you search.",
  },
  {
    title: "Menus",
    body: "The first time you open a venue, its menu is read from the venue's own website. If that fails, photograph or paste it. Delivery apps aren't used.",
  },
  {
    title: "Macros",
    body: "Claude lists each dish's likely ingredients and grams, including oil and butter a menu won't mention. The numbers are then calculated from a food composition table, never guessed by the AI.",
  },
  {
    title: "Ranges",
    body: "Real serves vary, so every dish is a range, ±20% for estimates. \"Fits\" means it fits even at the unfavourable end.",
  },
  {
    title: "Plate checks",
    body: "A photo narrows down portion sizes and spots what's missing or extra. It can't see oil or butter mixed in, so it's a check, not a lab test.",
  },
  {
    title: "Privacy",
    body: "No accounts. Targets, menus and checks stay in your browser. Photos are sent to Claude to be read and aren't kept.",
  },
];

export default function About() {
  return (
    <div className="stack-lg narrow">
      <section className="stack-sm">
        <div className="eyebrow">About</div>
        <h1>How MacroHunter works</h1>
        <p className="muted">Eat out and still hit your numbers. Every figure is an honest estimate.</p>
      </section>

      <div className="list">
        {STEPS.map((s) => (
          <div key={s.title} className="item" style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 16 }}>
            <div style={{ fontWeight: 600 }}>{s.title}</div>
            <p className="muted">{s.body}</p>
          </div>
        ))}
      </div>

      <section className="stack-sm">
        <h2>Coming later</h2>
        <p className="muted">
          <b style={{ color: "var(--text)", fontWeight: 600 }}>Venue-verified</b> dishes, where the venue confirms the recipe (±8%), and{" "}
          <b style={{ color: "var(--text)", fontWeight: 600 }}>lab-measured</b> dishes, bought anonymously and tested (±3%).
        </p>
      </section>

      <p className="small faint">A guide for everyday choices, not medical or dietary advice. With allergies, always ask the venue.</p>

      <Link href="/" className="btn primary" style={{ alignSelf: "flex-start", width: "fit-content" }}>
        Find food
      </Link>
    </div>
  );
}
