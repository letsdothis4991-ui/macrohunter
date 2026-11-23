import "leaflet/dist/leaflet.css";
import "./globals.css";

import type { Metadata, Viewport } from "next";
import { Instrument_Sans, Instrument_Serif } from "next/font/google";
import Link from "next/link";

import { Nav } from "~/components/nav";

const sans = Instrument_Sans({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const display = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-display", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Platewise", template: "%s, Platewise" },
  description: "Find food near you in Sydney that fits your protein, carbs, fat and calorie targets.",
  robots: { index: false, follow: false },
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#edebe6" },
    { media: "(prefers-color-scheme: dark)", color: "#1c1b19" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU" className={`${sans.variable} ${display.variable}`}>
      <body>
        <header className="header">
          <div className="container header-inner">
            <Link href="/" className="brand" aria-label="Platewise home">
              <svg className="brand-mark" viewBox="0 0 24 24" width="24" height="24" aria-hidden>
                <circle cx="12" cy="12" r="9" fill="none" stroke="var(--track)" strokeWidth="4" />
                <circle cx="12" cy="12" r="9" fill="none" stroke="var(--protein)" strokeWidth="4" strokeDasharray="22 100" transform="rotate(-90 12 12)" strokeLinecap="round" />
                <circle cx="12" cy="12" r="9" fill="none" stroke="var(--carbs)" strokeWidth="4" strokeDasharray="17 100" strokeDashoffset="-25" transform="rotate(-90 12 12)" strokeLinecap="round" />
                <circle cx="12" cy="12" r="9" fill="none" stroke="var(--fat)" strokeWidth="4" strokeDasharray="9 100" strokeDashoffset="-45" transform="rotate(-90 12 12)" strokeLinecap="round" />
              </svg>
              Platewise
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
