import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "How it works" };

export default function HowItWorks() {
  return (
    <div className="stack" style={{ maxWidth: 760 }}>
      <h1>How MacroHunter works</h1>
      <p className="muted">
        MacroHunter helps you eat out and still hit your numbers. Every figure is an estimate shown as a range, with a clear label for how sure we are.
      </p>

      <div className="card">
        <h2>1. Finding places</h2>
        <p>
          Places, ratings, prices and opening hours come live from Google each time you search, so they&apos;re always current. Pick an area, use your
          location, or tap the map, and choose how far you&apos;re happy to walk.
        </p>
      </div>

      <div className="card">
        <h2>2. Reading the menu</h2>
        <p>
          The first time you open a venue, MacroHunter reads its menu from the venue&apos;s own website. If that doesn&apos;t work, you can snap the menu,
          paste it, or give a link. We never read delivery apps; their terms don&apos;t allow it.
        </p>
        <p>
          For each dish, Claude (an AI model) lists the likely ingredients and how many grams of each, using typical Australian café and restaurant
          portions, including oil and butter that a description won&apos;t mention.
        </p>
      </div>

      <div className="card">
        <h2>3. Working out the macros</h2>
        <p>
          The AI never makes up the numbers. Calories, protein, carbs and fat are calculated from the ingredient weights using a food composition table
          in the style of the Australian AUSNUT database. That keeps estimates consistent and lets you see exactly what was assumed.
        </p>
        <p>
          Because real serves vary, every dish shows a <strong>range</strong>: estimated dishes are ±20% around the middle figure. On the fit check, the
          unfavourable end counts (least protein, most calories), so &quot;fits&quot; means it fits even on a generous plate.
        </p>
      </div>

      <div className="card">
        <h2>4. Check my plate</h2>
        <p>
          When your meal arrives, take a photo. Claude looks at the portion sizes using the plate and cutlery for scale, compares them with the menu, and
          recalculates. It tells you what it can&apos;t see, like butter in eggs or oil in a dressing. That&apos;s why it&apos;s called a check, not a
          verification.
        </p>
      </div>

      <div className="card">
        <h2>How sure are we?</h2>
        <table className="simple">
          <thead>
            <tr>
              <th>Label</th>
              <th>What it means</th>
              <th>Range</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <span className="badge est">Estimated</span>
              </td>
              <td>Worked out from the menu description and typical portions.</td>
              <td>±20%</td>
            </tr>
            <tr>
              <td>
                <span className="badge ver">✓ Venue-verified</span>
              </td>
              <td>The venue has confirmed the recipe and weights. Coming later.</td>
              <td>±8%</td>
            </tr>
            <tr>
              <td>
                <span className="badge ver">✓ Lab-measured</span>
              </td>
              <td>A mystery-bought dish measured by a food lab. Coming later.</td>
              <td>±3%</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2>Privacy</h2>
        <p>
          There are no accounts. Your targets, the menus you&apos;ve read and your plate checks are saved only in your browser. Photos are sent to Claude
          to be read and aren&apos;t stored by MacroHunter.
        </p>
      </div>

      <div className="notice warn small">
        MacroHunter is a guide for everyday choices, not medical or dietary advice. If you have allergies or a medical diet, always check with the venue.
      </div>

      <Link href="/" className="btn primary" style={{ alignSelf: "flex-start" }}>
        Find food
      </Link>
    </div>
  );
}
