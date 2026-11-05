import "leaflet/dist/leaflet.css";
import "./globals.css";

import type { Metadata, Viewport } from "next";
import Link from "next/link";

import { Nav } from "~/components/nav";

export const metadata: Metadata = {
  title: { default: "MacroHunter", template: "%s · MacroHunter" },
  description: "Find food near you in Sydney that fits your protein, carbs, fat and calorie targets.",
  robots: { index: false, follow: false },
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f5f1" },
    { media: "(prefers-color-scheme: dark)", color: "#121413" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU">
      <body>
        <header className="header">
          <div className="container header-inner">
            <Link href="/" className="brand" aria-label="MacroHunter home">
              <span className="brand-mark" aria-hidden>
                MH
              </span>
              MacroHunter
            </Link>
            <Nav />
          </div>
        </header>
        <main className="container">{children}</main>
        <footer className="footer container">
          Macros are estimates shown as ranges, not lab results. Venue ratings from Google. Map ©{" "}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
            OpenStreetMap
          </a>{" "}
          contributors.
        </footer>
      </body>
    </html>
  );
}
