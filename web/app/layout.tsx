import "leaflet/dist/leaflet.css";
import "./globals.css";

import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import Link from "next/link";

import { Nav } from "~/components/nav";

const sans = Figtree({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display", display: "swap", axes: ["wdth", "opsz"] });

export const metadata: Metadata = {
  title: { default: "MacroHunter", template: "%s, MacroHunter" },
  description: "Find food near you in Sydney that fits your protein, carbs, fat and calorie targets.",
  robots: { index: false, follow: false },
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#101512" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU" className={`${sans.variable} ${display.variable}`}>
      <body>
        <header className="header">
          <div className="container header-inner">
            <Link href="/" className="brand" aria-label="MacroHunter home">
              <span className="brand-mark" aria-hidden>
                <i className="seg-protein" />
                <i className="seg-carbs" />
                <i className="seg-fat" />
              </span>
              MacroHunter
            </Link>
            <Nav />
          </div>
        </header>
        <main className="container">{children}</main>
        <footer className="footer container">
          <Link href="/how-it-works" className="link quiet">
            How it works
          </Link>
          . Estimates, not lab results. Ratings from Google. Map ©{" "}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
            OpenStreetMap
          </a>
          .
        </footer>
      </body>
    </html>
  );
}
